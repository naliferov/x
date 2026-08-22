# PHP Version-Upgrade Audit — Reusable Playbook

Distilled from a real 8.1→8.4 audit of a Yii2 REST service. Use this for any future PHP bump (8.4→8.5, etc.). The headline lesson: **no single tool is enough** — run 4 static methods that _converge_ , then 1 runtime method for what static can't see. Each catches what the others miss.

## Step 0 — Recon first (facts before scanning)

-   **composer.json:** `require.php` constraint AND `config.platform.php` . The platform pin fixes resolution to that version AND version-bonds Rector/tools → **bump it first** (to the target), else every tool under-reports (see gotcha #1).
-   **composer.lock:** `grep '"abandoned"'` for dead deps; check majors of big libs vs the target PHP (e.g. Yii2 >=2.0.51 = 8.4-ready; SwiftMailer = abandoned; Flysystem v1 = EOL; lcobucci/jwt 4.x untested on 8.4).
-   **Dockerfiles:** which PHP each pins; HOW extensions install (bundled `docker-php-ext-install X` vs `pecl install X` ). 8.4 unbundles imap/pspell/oci8/pdo\_oci → a bundled install breaks the build.
-   **Deployed vs dev:** know which image is prod (e.g. Dockerfile.fpm/.cli = prod, a FrankenPHP one = local dev).
-   **error\_reporting overrides in php.ini:** do they mask deprecations? (e.g. masking `~E_DEPRECATED` & `~E_STRICT` → deprecation notices never hit prod logs; but `E_WARNING` is NOT masked.)
-   **CI/CD:** how images are built + deployed (e.g. CI globs every `Dockerfile.*` and builds each as `<name>-<suffix>` ; deploy via an ArgoCD GitOps repo → `<env>.yaml` ).

## The 4 static methods (run all — they converge; counts differ, categories agree)

### 1\. grep — fast first pass, scoping only

Cheap but unreliable — in one run it missed `&$request=null` (under-counted nullable ~46 vs real ~100) and over-counted CSV (25 vs real ~7–20). Never conclude from grep alone: use it to find candidates, then confirm with the tools below.

### 2\. Rector — auto-fixable deprecations + modernizations

Config (rector.php): `withPhpVersion(PhpVersion::PHP_84)` + `withSets([PHP_82, PHP_83, PHP_84])` . You MUST set `withPhpVersion` to the target or version-bonded rules silently skip (a false "0 changes").

**Split the rules:** deprecation-fixes (required) vs modernization (optional — e.g. `#[\Override]` , new-without-parens). Don't blind-apply modernizations — they were 88% of a 646-file diff in one run. To fix, run WITHOUT `--dry-run` but with ONLY the deprecation rules.

### 3\. PHPCompatibility — the detect-everything tool

Catches the non-auto-fixable too: removed constants, extension functions. Needs `dev-develop` for 8.4+ (the 2019 stable misses it).

Read `/out/phpcompat-src.txt` — the sniff histogram, your "everything" list. A single `testVersion 8.4` spans the whole chain (it caught 8.2 `${}` , 8.3 `get_class` , 8.4 items). Ignore "New … syntax found" sniffs — those are minimum-version flags, irrelevant to an upgrade.

### 4\. PHPStan — the only static way to catch dynamic properties

Also a second nullable confirm.

On Yii2 WITHOUT the Yii2 extension it's ~95% noise ("unknown class Yii", AR DB-column "undefined property"). Filter for the signal:

```
grep 'Access to an undefined property' /out/phpstan.txt \
  | grep -vE 'models\\|ActiveRecord|ActiveQuery|yii\\'
```

Then for each remaining hit, check the class's parent: extends Component/Model/Controller / a base with `__set` = shielded (false positive); `class X` / `class X implements …` (no `__set` ) = a real dynamic-property deprecation. Also `grep 'implicitly nullable'` for an independent nullable count.

## The 5th method — staging run (the only thing that closes the runtime gap)

Static tools cannot see value-dependent deprecations: runtime-conditional dynamic props, null-to-non-nullable-internal-param (8.1), implicit float→int (8.1). To catch them: build the target image, temporarily remove `~E_DEPRECATED` from error\_reporting, exercise the app / test-suite, and watch the deprecation log (e.g. JSON to stdout).

## Gotchas cheat-sheet (learned the hard way)

1.  `composer config.platform.php` pins the version → Rector/tools version-bond and report a false "0". Bump first.
2.  grep over/under-counts (refs with `&` , multiline signatures, already-fixed calls). Always confirm with a tool.
3.  PHPStan on Yii2 = mostly noise without the Yii2 extension + a real bootstrap (needs full env). Filter hard.
4.  8.4 unbundles imap/pspell/oci8/pdo\_oci. Bundled `docker-php-ext-install imap` fails → use `pecl install imap` (or mlocati install-php-extensions). PHPCompat also flags the ext's constants (TYPETEXT, FT\_UID…), not just funcs.
5.  `~E_STRICT` in php.ini = harmless no-op (the E\_STRICT level was removed in PHP 7.0; the ini reference does NOT warn — tested). Only referencing E\_STRICT in code warns. Drop it for tidiness, not correctness.
6.  Implicit-nullable ( `Type $x = null` ) & CSV `$escape` are auto-fixable by Rector (CSV inserts `escape:'\\'` , behavior-preserving). CSV's other option ( `escape:""` for RFC CSV) is a semantic choice → manual.
7.  Deprecations fire at compile time (once per file, not per call) and are masked by `~E_DEPRECATED` here → they will NOT spam prod logs. But `E_WARNING` (8.3 array\_sum non-numeric) is NOT masked.
8.  CI builds ALL `Dockerfile.*` → a broken extension install fails the build loudly (good). Test the prod image explicitly ( `docker build -f Dockerfile.fpm …` ) — `make up` may only build the dev image.

## Worked example — a real 8.1→8.4 audit (converged surface)

-   **implicit-nullable** — ~100 params / 87 files (Rector 99, PHPCompat 102, PHPStan 105 — all agree) → Rector auto
-   **CSV $escape** — 7 files / 20 calls → Rector auto ( `escape:'\\'` )
-   **dynamic properties** — 2 (a plain handler class + a chain-loader class) → declare the prop
-   **${} / get\_class()** — 1 / 2 → trivial
-   **ext-imap (BUILD)** — funcs + 12 constants, across 2 mail classes → CRITICAL: `pecl install imap`
-   **behavior** — array\_sum ×3, case ×55, DateTime ×130 → eyeball (mostly benign)
-   **vendors** — SwiftMailer (abandoned), Flysystem v1 (EOL), lcobucci/jwt 4.x → decision
-   **runtime** — unknown → staging run
-   **Dockerfile bumps** — php:8.1-fpm/cli → 8.4; FrankenPHP php8 → php8.4
