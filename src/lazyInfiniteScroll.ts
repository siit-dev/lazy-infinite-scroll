/**
 * LazyInfiniteScroll - Plugin for infinite scroll
 * requires IntersectionObserver (or polyfill)
 *
 * Author: Bogdan Barbu
 * Team: Codingheads (codingheads.com)
 */

type Morpher = (oldElement: Element, newElement: Element) => void;

export interface LazyInfiniteScrollOptions {
  containerSelector?: string;
  itemSelector?: string;
  paginationContainerSelector?: string | false;
  paginationLinksSelector?: string | false;
  loadButton?: string | HTMLElement | false;
  loadOnScroll?: boolean;
  numberOfPages?: number | false;
  currentPageNumber?: number | false;
  syncSelectors?: string[] | false;
  updateUrl?: boolean;
  morpher?: Morpher;
}

interface jQuery {
  LazyInfiniteScroll: LazyInfiniteScroll;
}

export default class LazyInfiniteScroll {
  containerSelector: string = '.articles-wrapper';
  #container: HTMLElement = null;
  itemSelector: string = 'article';
  paginationContainerSelector: string = '.page-pagination';
  paginationLinksSelector: string = '.page-pagination a';
  #pagination: HTMLElement = null;
  loadButton: string | HTMLElement | false = false;
  loadOnScroll: boolean = false;
  numberOfPages: number | false = false;
  currentPageNumber: number = 1;
  syncSelectors: string[] = [];
  updateUrl: boolean = true;
  morpher: Morpher;
  #element: HTMLElement = null;
  #currentLocation: string = window.location.href;
  #observer: IntersectionObserver = null;

  constructor(
    element: HTMLElement = document.body,
    {
      containerSelector = '.articles-wrapper',
      itemSelector = 'article',
      paginationContainerSelector = '.page-pagination',
      paginationLinksSelector = '.page-pagination a',
      loadButton = false,
      loadOnScroll = false,
      numberOfPages = false,
      currentPageNumber = 1,
      syncSelectors = [],
      updateUrl = true,
      morpher = (oldElement: Element, newElement: Element) => {
        oldElement.innerHTML = newElement.innerHTML;
      },
    }: LazyInfiniteScrollOptions = {},
    init: boolean = true
  ) {
    this.#element = element;

    // use the inline options, if available
    const settings = {
      containerSelector,
      itemSelector,
      paginationContainerSelector,
      paginationLinksSelector,
      loadButton,
      loadOnScroll,
      numberOfPages,
      currentPageNumber,
      syncSelectors,
      updateUrl,
      morpher,
    };
    this.#loadInlineOptions(settings);

    // initialize the plugin
    (this.#element as any).LazyInfiniteScroll = this;
    if (init) this.init();
  }

  // use the inline options, if available
  #loadInlineOptions(settings: Partial<LazyInfiniteScrollOptions> = {}) {
    const inlineOptions =
      'options' in this.#element.dataset ? JSON.parse(this.#element.dataset.options) : [];

    settings = {
      ...settings,
      ...inlineOptions,
    };
    Object.keys(settings).forEach(key => {
      this[key] = settings[key];
    });
  }

  // get the next page URL
  #getNextPageURL(content: HTMLElement): string | false {
    let nextPageURL: string | false = false;
    const pages =
      typeof this.paginationLinksSelector == 'string'
        ? content.querySelectorAll(this.paginationLinksSelector)
        : this.paginationLinksSelector;
    if (pages.length) {
      nextPageURL = [].reduce.call(
        pages,
        (url: string, page: HTMLAnchorElement) => {
          if (!url) {
            if (
              page.href != this.#currentLocation &&
              page.getAttribute('href') != this.#currentLocation
            ) {
              url = page.href;
            }
          }
          return url;
        },
        false
      );
    }
    return nextPageURL;
  }

  // parse a new page and add the new items
  #parsePage(
    data: string,
    nextUrl: string | false = false,
    resetContent: boolean = false
  ) {
    // add the new items
    const newHtml = document.createElement('html');
    newHtml.innerHTML = data;

    const newItems = newHtml.querySelectorAll(
      `${this.containerSelector} ${this.itemSelector}`
    );
    const fragment = document.createDocumentFragment();
    if (newItems.length) newItems.forEach(item => fragment.appendChild(item));
    if (resetContent) {
      this.#container.innerHTML = '';
    }
    this.#container.appendChild(fragment);

    // allow hooking into the new items
    this.#triggerEvent('infiniteScrollNewItems', {
      newItems,
      resetContent,
    });

    // trigger foundation if there is foundation in the page
    if ('jQuery' in window && 'foundation' in (window as any).jQuery.fn) {
      (window as any).jQuery(newItems).foundation();
    }

    // replace the pagination
    if (this.#pagination) {
      const paginationContent = newHtml.querySelector(
        this.paginationContainerSelector
      ) as HTMLElement;
      if (paginationContent) {
        this.morpher(this.#pagination, paginationContent);
        this.#initLoadOnScroll();
      } else {
        this.#pagination.innerHTML = '';
      }
    }

    // replace the other sync selectors
    if (this.syncSelectors && this.syncSelectors.length) {
      this.syncSelectors.forEach(selector => {
        const newElement = newHtml.querySelector(selector),
          oldElement = this.#element.querySelector(selector);
        if (newElement && oldElement) {
          this.morpher(oldElement, newElement);
        }
      });
    }

    if (resetContent) {
      this.#triggerEvent('infiniteScrollFullPageContent', {
        newHtml,
        newItems,
      });
    }

    // remove the "loading" class
    this.#element.classList.remove('loading');
    this.#element.classList.remove('loading-new');

    if (!resetContent) {
      this.currentPageNumber++;
      if (this.numberOfPages && this.currentPageNumber > this.numberOfPages) {
        this.#pagination.remove();
      }
    } else {
      this.currentPageNumber = 1;
      this.#loadInlineOptions();
      if (nextUrl && this.updateUrl) history.pushState(null, null, nextUrl);
    }
  }

  // dispatch custom events
  #triggerEvent(eventType: string, detail = {}, target: HTMLElement = null) {
    const event = new CustomEvent(eventType, {
      bubbles: true,
      cancelable: true,
      detail: {
        infiniteScroll: this,
        ...detail,
      },
    });
    return !target ? this.#element.dispatchEvent(event) : target.dispatchEvent(event);
  }

  // load a page by URL
  loadPage(nextUrl: string, resetContent: boolean = false) {
    this.#element.classList.add('loading');
    if (resetContent) {
      this.#element.classList.add('loading-new');
    }
    const parseData = (data: string) => {
      this.#parsePage(data, nextUrl, resetContent);
      this.#triggerEvent('infiniteScrollLoadedPage');
      this.#triggerEvent('post-load'); // for scripts that depend on this event
    };
    fetch(nextUrl, {
      credentials: 'include',
    })
      .then(response => {
        // handle redirected URLs
        if (response.redirected) {
          nextUrl = response.url;
        }
        return response;
      })
      .then(response => response.text())
      .then(parseData)
      .catch(error => {
        console.error(error);
        console.log('There has been an error loading the next page.', error.toString());
      });
  }

  // load the next page
  loadNextPage(resetContent: boolean = false) {
    if (!this.#element.classList.contains('loading')) {
      const nextUrl = this.#getNextPageURL(document.documentElement);
      if (nextUrl) {
        if (
          this.#triggerEvent('infiniteScrollLoadingPage', {
            nextUrl,
            resetContent,
          })
        ) {
          this.loadPage(nextUrl, resetContent);
        }
      }
    }
  }

  init = () => {
    this.#container = document.querySelector(this.containerSelector);
    if (!this.#container) {
      throw new Error(
        `Lazyload container not found for selector: ${this.containerSelector}`
      );
    }

    this.#pagination = document.querySelector(this.paginationContainerSelector);
    this.#currentLocation = this.#element.dataset.currentLocation || window.location.href;

    // load more on click (load more or pagination)
    document.addEventListener('click', e => {
      const target = e.target as HTMLElement;
      if (target) {
        if (
          (typeof this.loadButton == 'string' && target.matches(this.loadButton)) ||
          target == this.loadButton
        ) {
          e.preventDefault();
          this.loadNextPage();
        } else if (target.matches(this.paginationLinksSelector)) {
          const newURL = (target as HTMLAnchorElement).href || (target as any).value;
          if (newURL) {
            e.preventDefault();
            if (
              this.#triggerEvent(
                'infiniteScrollLoadingFullPage',
                {
                  nextUrl: newURL,
                  triggerElement: target,
                },
                target
              )
            ) {
              this.loadPage(newURL, true);
            }
          }
        }
      }
    });

    // handle "data-load-full-page" anchors
    const fullPageLoad = (e: Event) => {
      const target = e.target as HTMLElement;
      if (
        target &&
        ((e.type == 'click' && target.matches('[data-load-full-page]')) ||
          (e.type == 'change' && target.matches('[data-load-full-page-select]')))
      ) {
        const newURL =
          target.dataset.loadFullPage ||
          (target as HTMLAnchorElement).href ||
          (target as any).value;
        if (newURL) {
          e.preventDefault();
          if (
            this.#triggerEvent(
              'infiniteScrollLoadingFullPage',
              {
                nextUrl: newURL,
                triggerElement: target,
              },
              target
            )
          ) {
            this.loadPage(newURL, true);
          }
        }
      }
    };
    this.#element.addEventListener('click', fullPageLoad);
    this.#element.addEventListener('change', fullPageLoad);

    // observe intersection
    this.#initLoadOnScroll();
    this.#triggerEvent('infiniteScrollInit');
  };

  // intersection-observe the pagination button
  #initLoadOnScroll() {
    this.#pagination = document.querySelector(this.paginationContainerSelector);

    // observe intersection
    if (this.loadOnScroll && this.#pagination) {
      if (!this.#observer) {
        this.#observer = new IntersectionObserver(() => this.loadNextPage(), {
          rootMargin: '200px',
        });
      }
      this.#observer.observe(this.#pagination);
    }
  }
}

// register as a jQuery plugin, if jQuery is available
if ('jQuery' in window) {
  (function ($) {
    $.fn.lazyInfiniteScroll = function (settings = {}) {
      this.each(function () {
        if (!this.LazyInfiniteScroll) {
          // don't initialize twice
          new LazyInfiniteScroll(this, settings);
        }
      });
      return this;
    };
  })((window as any).jQuery);
}
