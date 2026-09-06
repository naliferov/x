// Render a FictionBook 2 (.fb2) file as book HTML. fb2 is XML: a <description> (metadata), one or
// more <body> (the text, in nested <section>s), and <binary> blobs (base64 images). We render the
// first body and inline any referenced images from the binaries; metadata and note-bodies are skipped.

const XLINK = 'http://www.w3.org/1999/xlink'

const escapeText = (text: string) =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

// fb2 declares its own encoding (Russian books are often windows-1251, not UTF-8), so decode from
// bytes using the declared charset rather than assuming UTF-8.
export const decodeFb2 = (buffer: ArrayBuffer) => {
  const head = new TextDecoder('ascii').decode(buffer.slice(0, 200))
  const declared = head.match(/encoding=["']([^"']+)["']/i)?.[1]?.toLowerCase()
  try {
    return new TextDecoder(declared || 'utf-8').decode(buffer)
  } catch {
    return new TextDecoder('utf-8').decode(buffer)
  }
}

export const fb2ToHtml = (xml: string) => {
  const doc = new DOMParser().parseFromString(xml, 'application/xml')
  if (doc.querySelector('parsererror')) {
    throw new Error('malformed fb2 XML')
  }

  // binary id -> data URI, for <image l:href="#id"> references
  const images = new Map<string, string>()
  for (const binary of Array.from(doc.getElementsByTagName('binary'))) {
    const id = binary.getAttribute('id')
    const type = binary.getAttribute('content-type') || 'image/jpeg'
    if (id) {
      images.set(id, `data:${type};base64,${(binary.textContent ?? '').trim()}`)
    }
  }
  const imageHref = (el: Element) =>
    (
      el.getAttributeNS(XLINK, 'href') ||
      el.getAttribute('l:href') ||
      el.getAttribute('href') ||
      ''
    ).replace(/^#/, '')

  const children = (el: Element) => Array.from(el.childNodes).map(render).join('')

  const render = (node: Node): string => {
    if (node.nodeType === Node.TEXT_NODE) {
      return escapeText(node.nodeValue ?? '')
    }
    if (node.nodeType !== Node.ELEMENT_NODE) {
      return ''
    }
    const el = node as Element
    switch (el.localName) {
      case 'section':
        return `<section>${children(el)}</section>`
      case 'title':
        // fb2 titles wrap <p> lines; flatten to a heading (nested <p> in a heading is invalid html)
        return `<h2>${
          Array.from(el.getElementsByTagName('p'))
            .map((paragraph) => escapeText(paragraph.textContent ?? ''))
            .join('<br>') || escapeText(el.textContent ?? '')
        }</h2>`
      case 'subtitle':
        return `<h3>${children(el)}</h3>`
      case 'p':
        return `<p>${children(el)}</p>`
      case 'empty-line':
        return '<br>'
      case 'emphasis':
        return `<em>${children(el)}</em>`
      case 'strong':
        return `<strong>${children(el)}</strong>`
      case 'strikethrough':
        return `<s>${children(el)}</s>`
      case 'sub':
        return `<sub>${children(el)}</sub>`
      case 'sup':
        return `<sup>${children(el)}</sup>`
      case 'epigraph':
      case 'cite':
        return `<blockquote>${children(el)}</blockquote>`
      case 'text-author':
        return `<p class="fb2-author">${children(el)}</p>`
      case 'poem':
        return `<div class="fb2-poem">${children(el)}</div>`
      case 'stanza':
        return `<div class="fb2-stanza">${children(el)}</div>`
      case 'v':
        return `<div>${children(el)}</div>`
      case 'image': {
        const src = images.get(imageHref(el))
        return src ? `<img src="${src}" alt="" />` : ''
      }
      default:
        return children(el) // unwrap unknown wrappers, keep their text
    }
  }

  const body = doc.getElementsByTagName('body')[0]
  return body ? children(body) : ''
}
