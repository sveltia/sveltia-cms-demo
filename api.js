/**
 * Examples of the Sveltia CMS JavaScript API, used by the API Examples collection in `config.yml`.
 * The `CMS` object and the `html` tag for writing React components with HTM are globals defined by
 * the CMS script loaded before this one. The sections follow the order of the API documentation.
 * @see https://sveltiacms.app/en/docs/api
 */

/* global CMS, html */

const { useState } = CMS.React;

// Custom editor components, available in every RichText field, in the order of the Insert menu
// https://sveltiacms.app/en/docs/api/editor-components

// A block with a custom Markdown syntax and a DOM element preview
CMS.registerEditorComponent({
  id: 'callout',
  label: 'Callout',
  icon: 'campaign',
  fields: [
    { name: 'type', label: 'Type', widget: 'select', options: ['tip', 'note', 'warning'] },
    { name: 'message', label: 'Message', widget: 'text' },
  ],
  pattern: /^:::(?<type>tip|note|warning)\n(?<message>[\s\S]*?)\n:::$/m,
  toBlock: ({ type = 'tip', message = '' }) => `:::${type}\n${message}\n:::`,
  toPreview: ({ type = 'tip', message = '' }) => {
    const element = document.createElement('aside');
    const colors = { tip: '#2f7d5b', note: '#3a6ea5', warning: '#c77d1a' };

    element.style.cssText = `padding: 8px 16px; border-left: 4px solid ${colors[type]}`;
    // Insert the message as text, so any HTML in it isn’t rendered
    element.textContent = `${type.toUpperCase()}: ${message}`;

    return element;
  },
});

/**
 * Create a figure element for the Image with Caption component. The values are set as text and
 * attributes, so they don’t have to be escaped.
 * @param {{ src?: string, caption?: string }} values Field values.
 * @returns {HTMLElement} Element.
 */
const createFigure = ({ src = '', caption = '' }) => {
  const figure = document.createElement('figure');
  const img = document.createElement('img');
  const figcaption = document.createElement('figcaption');

  img.setAttribute('src', src);
  img.setAttribute('alt', '');
  img.style.maxWidth = '100%';
  figcaption.textContent = caption;
  figure.append(img, figcaption);

  return figure;
};

// A block with an Image field, with both Markdown (a Hugo shortcode) and HTML syntaxes
CMS.registerEditorComponent({
  id: 'figure',
  label: 'Image with Caption',
  icon: 'photo',
  fields: [
    { name: 'src', label: 'Image', widget: 'image' },
    { name: 'caption', label: 'Caption', required: false },
  ],
  // Markdown syntax
  pattern: /^{{< figure src="(?<src>.*?)" caption="(?<caption>.*?)" >}}$/m,
  toBlock: ({ src = '', caption = '' }) => `{{< figure src="${src}" caption="${caption}" >}}`,
  // HTML syntax, used in a RichText field with `format: html`
  htmlSelector: 'figure',
  fromBlockHTML: (element) => ({
    src: element.querySelector('img')?.getAttribute('src') ?? '',
    caption: element.querySelector('figcaption')?.textContent ?? '',
  }),
  toBlockHTML: createFigure,
  // The same element works as the preview; the image source is replaced with a URL that works
  toPreview: createFigure,
});

// A block with a Code field, whose value is an object with the `code` and `lang` keys
CMS.registerEditorComponent({
  id: 'code-sample',
  label: 'Code Sample',
  icon: 'code_blocks',
  fields: [
    { name: 'title', label: 'Title' },
    { name: 'snippet', label: 'Snippet', widget: 'code' },
  ],
  pattern:
    /{{< code-sample title="(?<title>.*?)" lang="(?<lang>.*?)" >}}\n(?<code>[\s\S]*?)\n{{< \/code-sample >}}/,
  fromBlock: ({ groups: { title, lang, code } = {} }) => ({ title, snippet: { code, lang } }),
  toBlock: ({ title = '', snippet: { code = '', lang = 'plain' } = {} }) =>
    `{{< code-sample title="${title}" lang="${lang}" >}}\n${code}\n{{< /code-sample >}}`,
  // A fenced code block is highlighted and escaped in the preview
  toPreview: ({ title = '', snippet: { code = '', lang = 'plain' } = {} }) =>
    `**${title}**\n\n\`\`\`${lang}\n${code}\n\`\`\``,
});

// An inline chip that opens a dialog, labelled with the `summary` template
CMS.registerEditorComponent({
  id: 'custom-link',
  label: 'Custom Link',
  icon: 'link',
  mode: 'dialog',
  summary: '{{text}} — {{url}}',
  fields: [
    { name: 'text', label: 'Link Text' },
    { name: 'url', label: 'URL', type: 'url' },
  ],
  pattern: /\[link text="(?<text>.*?)" url="(?<url>.*?)"\]/,
  toBlock: ({ text = '', url = '' }) => `[link text="${text}" url="${url}"]`,
  toPreview: ({ text = '', url = '' }) => `<a href="${url}">${text}</a>`,
});

// An inline chip that opens a dialog, showing the selected image as a thumbnail
CMS.registerEditorComponent({
  id: 'icon',
  label: 'Icon',
  icon: 'star',
  mode: 'dialog',
  thumbnail: 'src',
  fields: [{ name: 'src', label: 'Icon', widget: 'image', accept: 'image/svg+xml' }],
  pattern: /{{< icon src="(?<src>.*?)" >}}/,
  toBlock: ({ src = '' }) => `{{< icon src="${src}" >}}`,
  toPreview: ({ src = '' }) => `<img width="24" height="24" src="${src}" alt="">`,
});

// An inline select box right within the text, added with a toolbar button instead of the menu
CMS.registerEditorComponent({
  id: 'status',
  label: 'Status',
  icon: 'flag',
  mode: 'inline',
  trigger: 'button',
  fields: [
    { name: 'value', label: 'Status', widget: 'select', options: ['draft', 'review', 'done'] },
  ],
  pattern: /\[status:(?<value>\w+)\]/,
  toBlock: ({ value = 'draft' }) => `[status:${value}]`,
  toPreview: ({ value = 'draft' }) => `<mark>${value}</mark>`,
});

// Custom field type: a star rating stored as a number
// https://sveltiacms.app/en/docs/api/field-types

/**
 * Editor control of the Rating field type.
 * @param {object} props Props.
 * @param {number} [props.value] Current rating.
 * @param {any} props.field Field configuration as an Immutable Map.
 * @param {string} props.forID ID of the field, to be given to the input.
 * @param {(value: number) => void} props.onChange Function to update the value.
 * @returns {any} React element.
 */
const RatingControl = ({ value, field, forID, onChange }) => {
  const max = field.get('max') ?? 5;
  const [hovered, setHovered] = useState(0);
  const shown = hovered || value || 0;

  return html`
    <div
      id=${forID}
      role="radiogroup"
      style="display: flex; gap: 4px"
      onMouseLeave=${() => setHovered(0)}
    >
      ${Array.from({ length: max }, (_, index) => {
        const rating = index + 1;

        return html`
          <button
            type="button"
            role="radio"
            aria-checked=${rating === value}
            aria-label=${`${rating} of ${max}`}
            style="padding: 0; border: 0; background: none; font-size: 24px; cursor: pointer;
              color: ${rating <= shown ? '#f0a030' : 'gray'}"
            onMouseEnter=${() => setHovered(rating)}
            onClick=${() => onChange(rating)}
          >
            ${rating <= shown ? '★' : '☆'}
          </button>
        `;
      })}
    </div>
  `;
};

/**
 * Preview of the Rating field type, also used as the summary of a collapsed List item.
 * @param {object} props Props.
 * @param {number} [props.value] Current rating.
 * @param {any} [props.field] Field configuration as an Immutable Map.
 * @returns {any} React element.
 */
const RatingPreview = ({ value, field }) => {
  const max = field?.get('max') ?? 5;

  return html`<span title=${`${value ?? 0} of ${max}`}>
    ${'★'.repeat(value ?? 0)}${'☆'.repeat(Math.max(0, max - (value ?? 0)))}
  </span>`;
};

CMS.registerFieldType({
  name: 'rating',
  controlComponent: RatingControl,
  previewComponent: RatingPreview,
  summaryComponent: RatingPreview,
  // Validates the custom `max` option in the configuration
  schema: { properties: { max: { type: 'integer', minimum: 1, maximum: 10 } } },
});

// Custom string transformation: initials of a name, used in a Compute field and a List summary
// https://sveltiacms.app/en/docs/api/string-transformations

CMS.registerStringTransformation('initials', (value) =>
  String(value ?? '')
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word[0].toUpperCase())
    .join(''),
);

// Custom page: a guide to this demo, shown in the global toolbar
// https://sveltiacms.app/en/docs/api/custom-pages

const API_EXAMPLES = [
  ['Custom Editor Components', 'editor-components', 'editor-components'],
  ['Custom Field Types', 'field-types', 'field-types'],
  ['Custom String Transformations', 'string-transformations', 'string-transformations'],
  ['Event Hooks', 'events', 'events'],
];

/**
 * Content of the Demo Guide page.
 * @returns {any} React element.
 */
const DemoGuide = () => html`
  <div style="max-width: 720px; padding: 16px 24px; line-height: 1.6">
    <h2>About This Demo</h2>
    <p>
      Everything here is stored in your browser, so feel free to change anything. To start over,
      choose Settings › Advanced › Erase All Data.
    </p>
    <p>
      This page is a custom page added with <code>CMS.registerCustomPage()</code>. The following
      examples of the JavaScript API are defined in <code>api.js</code>:
    </p>
    <ul>
      ${API_EXAMPLES.map(
        ([label, file, doc]) => html`
          <li key=${file}>
            <a href=${`#/collections/api/entries/${file}`}>${label}</a>
            ${' · '}
            <a href=${`https://sveltiacms.app/en/docs/api/${doc}`} target="_blank">Docs</a>
          </li>
        `,
      )}
    </ul>
  </div>
`;

CMS.registerCustomPage({
  id: 'guide',
  label: 'Demo Guide',
  icon: 'info',
  component: DemoGuide,
});

// Event hooks: count the saves of an entry and record the time of the last one
// https://sveltiacms.app/en/docs/api/events

CMS.registerEventListener({
  name: 'preSave',
  handler: ({ entry }) => {
    if (entry.get('path') !== 'content/api/events.yml') {
      return undefined;
    }

    const data = entry.get('data');

    // Return the updated data to save it
    return data
      .set('save_count', (data.get('save_count') ?? 0) + 1)
      .set('last_saved', new Date().toISOString());
  },
});

CMS.registerEventListener({
  name: 'postSave',
  handler: ({ entry, author }) => {
    // eslint-disable-next-line no-console
    console.info(`postSave: ${entry.get('path')} was saved by ${author.name || 'you'}`);
  },
});
