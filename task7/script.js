(function () {
  'use strict';
  const CONFIG = Object.freeze({
    apiUrl: 'https://jsonplaceholder.typicode.com/posts',
    pageSize: 10,
    scrollThreshold: 200, 
    searchDelay: 300 
  });

  function debounce(callback, delay) {
    let timerId = null; 
    return function (...args) {
      clearTimeout(timerId);
      timerId = setTimeout(() => {
        timerId = null;
        callback(...args);
      }, delay);
    };
  }

  
  class FeedModel {
    constructor(pageSize) {
      this.pageSize = pageSize;
      this.posts = []; // общий массив всех загруженных постов
      this.nextStart = 0; // с какого индекса просить следующую порцию
      this.hasMore = true; // есть ли ещё посты на сервере
      this.isLoading = false;
      this.error = null; // текст ошибки или null
      this.query = ''; // текущий поисковый запрос (в нижнем регистре)
    }

    addPosts(newPosts) {
      this.posts.push(...newPosts);
      this.nextStart += newPosts.length;

      // Если пришло меньше, чем просили, — сервер закончился.
      if (newPosts.length < this.pageSize) {
        this.hasMore = false;
      }
    }

    setQuery(text) {
      this.query = text.trim().toLowerCase();
    }

    /** Подходит ли пост под фильтр: подстрока в title без учёта регистра. */
    matches(post) {
      return post.title.toLowerCase().includes(this.query);
    }

    filter(posts) {
      return posts.filter((post) => this.matches(post));
    }

    getVisiblePosts() {
      return this.filter(this.posts);
    }

    startLoading() {
      this.isLoading = true;
      this.error = null;
    }

    finishLoading() {
      this.isLoading = false;
    }

    setError(message) {
      this.error = message;
    }
  }
  class PostsApi {
    constructor(baseUrl) {
      this.baseUrl = baseUrl;
    }

    async fetchPosts(start, limit) {
      const url = `${this.baseUrl}?_start=${start}&_limit=${limit}`;

      try {
        const response = await fetch(url);

        if (!response.ok) {
          throw new HttpError(response.status);
        }

        return await response.json();
      } catch (error) {
        if (error instanceof HttpError) {
          throw new Error(`Сервер ответил ошибкой (код ${error.status}). Попробуйте позже.`);
        }
        throw new Error('Не удалось загрузить посты. Проверьте подключение к интернету.');
      }
    }
  }

  class HttpError extends Error {
    constructor(status) {
      super(`HTTP ${status}`);
      this.status = status;
    }
  }

  class FeedView {
    constructor(elements) {
      this.listEl = elements.list;
      this.loaderEl = elements.loader;
      this.errorEl = elements.error;
      this.errorTextEl = elements.errorText;
      this.retryBtn = elements.retryBtn;
      this.emptyEl = elements.empty;
      this.endEl = elements.end;
      this.searchEl = elements.search;
    }

    renderPosts(posts) {
      this.listEl.replaceChildren(...posts.map((post) => this.createCard(post)));
    }

    appendPosts(posts) {
      this.listEl.append(...posts.map((post) => this.createCard(post)));
    }

    createCard(post) {
      const card = document.createElement('article');
      card.className = 'card';

      const title = document.createElement('h2');
      title.className = 'card__title';
      title.textContent = post.title; 

      const body = document.createElement('p');
      body.className = 'card__body';
      body.textContent = post.body;

      const meta = document.createElement('div');
      meta.className = 'card__meta';
      meta.textContent = `Автор: ${post.userId} · Пост №${post.id}`;

      card.append(title, body, meta);
      return card;
    }

    renderStatus({ isLoading, error, isEmpty, isEnd }) {
      this.loaderEl.hidden = !isLoading;

      this.errorEl.hidden = !error;
      this.errorTextEl.textContent = error || '';

      this.emptyEl.hidden = !isEmpty;
      this.endEl.hidden = !isEnd;
    }

    onSearch(handler) {
      this.searchEl.addEventListener('input', () => handler(this.searchEl.value));
    }

    onRetry(handler) {
      this.retryBtn.addEventListener('click', handler);
    }
  }

  class FeedController {
    constructor(model, api, view, config) {
      this.model = model;
      this.api = api;
      this.view = view;
      this.scrollThreshold = config.scrollThreshold;
      this.searchDelay = config.searchDelay;

      this.loadNextPage = this.loadNextPage.bind(this);
      this.handleScroll = this.handleScroll.bind(this);
      this.handleSearch = this.handleSearch.bind(this);
      this.handleRetry = this.handleRetry.bind(this);
    }

    init() {
      this.view.onSearch(debounce(this.handleSearch, this.searchDelay));
      this.view.onRetry(this.handleRetry);
      window.addEventListener('scroll', this.handleScroll, { passive: true });

      this.loadNextPage();
    }

    async loadNextPage() {
      const { model } = this;
      if (model.isLoading || !model.hasMore) return;

      model.startLoading();
      this.updateStatus();

      try {
        const newPosts = await this.api.fetchPosts(model.nextStart, model.pageSize);

        model.addPosts(newPosts);
        this.view.appendPosts(model.filter(newPosts)); // добавляем только подходящие под фильтр
      } catch (error) {
        model.setError(error.message);
      } finally {
        model.finishLoading();
        this.updateStatus();
      }

      this.loadMoreIfNeeded();
    }

    handleScroll() {
      this.loadMoreIfNeeded();
    }

    loadMoreIfNeeded() {
      const { model } = this;
      if (model.isLoading || !model.hasMore || model.error) return;

      if (this.isNearPageBottom()) {
        this.loadNextPage();
      }
    }

    isNearPageBottom() {
      const scrolled = window.innerHeight + window.scrollY;
      const pageHeight = document.documentElement.scrollHeight;
      return scrolled >= pageHeight - this.scrollThreshold;
    }

    handleSearch(text) {
      this.model.setQuery(text);
      this.view.renderPosts(this.model.getVisiblePosts());
      this.updateStatus();
      this.loadMoreIfNeeded();
    }

    handleRetry() {
      this.model.error = null;
      this.loadNextPage();
    }

    updateStatus() {
      const { model } = this;
      const hasVisible = model.getVisiblePosts().length > 0;
      const finished = !model.hasMore && !model.isLoading;

      this.view.renderStatus({
        isLoading: model.isLoading,
        error: model.error,
        isEmpty: finished && !hasVisible && !model.error,
        isEnd: finished && hasVisible && !model.error
      });
    }
  }

  function main() {
    const view = new FeedView({
      list: document.getElementById('posts'),
      loader: document.getElementById('loader'),
      error: document.getElementById('error'),
      errorText: document.getElementById('error-text'),
      retryBtn: document.getElementById('retry'),
      empty: document.getElementById('empty'),
      end: document.getElementById('end'),
      search: document.getElementById('search')
    });

    const model = new FeedModel(CONFIG.pageSize);
    const api = new PostsApi(CONFIG.apiUrl);
    const controller = new FeedController(model, api, view, CONFIG);

    controller.init();
  }

  document.addEventListener('DOMContentLoaded', main);
})();
