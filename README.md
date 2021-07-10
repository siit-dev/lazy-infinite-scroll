# Lazy Infinite Scroll

This library allows you to create infinite scroll/infinite loading for archive pages, Ajax-load content when filters change, ajax-loaded pagination and some more. It requires `IntersectionObserver` and `fetch`, supported by all modern browsers (> 95% of browsers; for the rest, you can use polyfill.io).

The plugin doesn't require jQuery, but it adds itself to jQuery if jQuery exists on the page.

## Installing

Use npm (or yarn) to install the package.

```npm2yarn
npm install --save @codingheads/lazy-infinite-scroll
```

## Initializing in JavaScript

To initialize the library, you need to create a new instance of the `LazyInfiniteScroll` class:

```javascript
import LazyInfiniteScroll from '@codingheads/lazy-infinite-scroll';

window.addEventListener('DOMContentLoaded', () => {
  // initialize infinite scroll
  const wrapperElement = document.querySelector('body.archive');
  new LazyInfiniteScroll(wrapperElement, {
    containerSelector: '.articles-wrapper',
    itemSelector: 'article',
    paginationContainerSelector: '.section-pagination',
    paginationLinksSelector: '.pagination a',
    loadButton: '.pagination .load-more',
    loadOnScroll: false,
    syncSelectors: ['.section-auxiliary'], // other elements to be synced from the new page - pagination, filters etc
  });
});
```

Or using jQuery:

```javascript
import $ from 'jquery';
import '@codingheads/lazy-infinite-scroll';

$(() => {
  // initialize infinite scroll
  $('body.archive').lazyInfiniteScroll({
    containerSelector: '.articles-wrapper',
    itemSelector: 'article',
    paginationContainerSelector: '.section-pagination',
    paginationLinksSelector: '.pagination a',
    loadButton: '.pagination .load-more',
    loadOnScroll: false,
    syncSelectors: ['.section-auxiliary'],
  });
});
```

The options object can have the following properties:

- `containerSelector` - the selector for the element that contains the items (e.g. the wrapper around the articles on a blog page). The new elements will be appended or will replace the content of this container.
- `itemSelector` - the selector for the individual items
- `paginationContainerSelector` - the selector for the pagination container
- `paginationLinksSelector` - the selector for the anchors in the pagination (individual page links)
- `loadButton` - the selector or the HTMLElement for the "load more" button
- `loadOnScroll` - whether to automatically load the next page when the pagination comes into view
- `syncSelectors` - an array of selectors that should be synced when loading the new page (Warning! the elements should be unique - don't add here selectors that will return more than 1 item!)

These options can also be set directly on the container element (the `body.archive` element in our examples above). Make sure you have a valid JSON string there (e.g. in WordPress you can use `echo esc_attr(json_encode($settings))`).

```html
<div
  class="infinite-wrapper"
  data-options='{"containerSelector":".articles-wrapper", "itemSelector":"article"}'
></div>
```

## Page change sources

- New pages are loaded when the pagination links are used or the "load more" button is clicked.
- You can also use the `data-load-full-page` attribute on other links to trigger a page-load for the URL of that anchor, or you can use `data-load-full-page-select` on select elements (this will use the `value` attribute of the `select`). This is helpful when you need to change the page content when the user changes filters, for example.

## Events

- `infiniteScrollInit` – on initialization
- `infiniteScrollLoadingPage` – when a new page is being loaded
- `infiniteScrollLoadedPage` – after a new page has been loaded
- `infiniteScrollLoadingFullPage` – when a new page is being loaded, and the existing content will be replaced by the new one
- `infiniteScrollFullPageContent` – when a new page has been loaded and it has replaced the old content. (`event.detail.newHtml` is the new HTML of the page, `event.detail.newItems` are the new items)
- `infiniteScrollNewItems` – when new items have been added to the page (`event.detail.newItems` are the new elements)
- `post-load`

## Methods

The LazyInfiniteScroll instance is added to the element for which it is initialized. You can access it as `element.LazyInfiniteScroll`.

It has the following methods you can use:

- `loadNextPage(resetContent = false)` – load the next page. If `resetContent` is `true`, the new content will replace the old one.
- `loadPage(nextUrl, resetContent = false)` – load a specific URL

## CSS

When the new page is being loaded, on the wrapper element we will have the `loading` class. When the new page will replace the old one, the `loading-new` class is also added. These classes are removed once the new content has been loaded.
