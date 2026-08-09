**distributive conditional type**

`U` стоит голым слева от `extends` → условный тип раздаётся по членам союза: каждый член подставляется отдельно, результаты склеиваются обратно союзом.

```ts
type Distribute<U> = U extends unknown ? (arg: U) => void : never;

type Result = Distribute<{ 'crm': 'crm' } | { 'crm.contacts': 'crm/contacts' }>;
// = ((arg: { 'crm': 'crm' }) => void) | ((arg: { 'crm.contacts': 'crm/contacts' }) => void)
```

Что удовлетворяет полученному типу:

```ts
const a: Result = (arg: { 'crm': 'crm' }) => {};          // ✅
const b: Result = (arg: { settings: 'settings' }) => {};  // ❌
```
