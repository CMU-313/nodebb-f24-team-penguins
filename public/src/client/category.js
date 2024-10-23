'use strict';

define('forum/category', [
	'forum/infinitescroll',
	'share',
	'navigator',
	'topicList',
	'sort',
	'categorySelector',
	'hooks',
	'alerts',
	'api',
], function (infinitescroll, share, navigator, topicList, sort, categorySelector, hooks, alerts, api) {
	const Category = {};

	let searchResultCount = 0;
	$(window).on('action:ajaxify.start', function (ev, data) {
		if (!String(data.url).startsWith('category/')) {
			navigator.disable();
		}
	});

	Category.init = function () {
		const cid = ajaxify.data.cid;
		Category.cid = cid;

		app.enterRoom('category_' + cid);

		share.addShareHandlers(ajaxify.data.name);

		topicList.init('category', loadTopicsAfter);

		sort.handleSort('categoryTopicSort', 'category/' + ajaxify.data.slug);
		if (!config.usePagination) {
			navigator.init('[component="category/topic"]', ajaxify.data.topic_count, Category.toTop, Category.toBottom);
		} else {
			navigator.disable();
		}

		handleScrollToTopicIndex();

		handleIgnoreWatch(cid);

		handleLoadMoreSubcategories();

		handleBookmarks();

		categorySelector.init($('[component="category-selector"]'), {
			privilege: 'find',
			parentCid: ajaxify.data.cid,
			onSelect: function (category) {
				ajaxify.go('/category/' + category.cid);
			},
		});

		hooks.fire('action:topics.loaded', { topics: ajaxify.data.topics });
		hooks.fire('action:category.loaded', { cid: ajaxify.data.cid });
		handleSearch();
	};

	function handleScrollToTopicIndex() {
		let topicIndex = ajaxify.data.topicIndex;
		if (topicIndex && utils.isNumber(topicIndex)) {
			topicIndex = Math.max(0, parseInt(topicIndex, 10));
			if (topicIndex && window.location.search.indexOf('page=') === -1) {
				navigator.scrollToElement($('[component="category/topic"][data-index="' + topicIndex + '"]'), true, 0);
			}
		}
	}

	function handleSearch(params) {
		searchResultCount = params && params.resultCount;
		$('#search-user').on('keyup', utils.debounce(doSearch, 250));
	}

	function doSearch() {
		$('[component="user/search/icon"]').removeClass('fa-search').addClass('fa-spinner fa-spin');

		const query = $('#search-user').val().trim();
		const cid = ajaxify.data.cid || Category.cid;

		const params = {
			query: query,
			cid: cid,
		};

		api.get('/api/v3/search/topics', params)
			.then(({ topics }) => {
				console.log('API response topics:', topics);
				renderSearchResults(topics);
			});
	}

	function renderSearchResults(topics) {
		if (searchResultCount) {
			topics = topics.slice(0, searchResultCount);
		}

		const tplData = {
			topics: topics,
			showSelect: ajaxify.data.showSelect,
			template: {
				name: 'category',
			},
		};
		tplData.template.category = true;
		app.parseAndTranslate('category', 'topics', tplData, function (html) {
			const topicListEl = $('[component="category"]');
			topicListEl.empty().append(html);
			topicListEl.find('.timeago').timeago();
			$('[component="user/search/icon"]').addClass('fa-search').removeClass('fa-spinner fa-spin');
		});
	}

	function handleBookmarks() {
		$('[component="category/bookmark"]').on('click', async function () {
			const $this = $(this);
			const topicId = $this.data('tid');
			const isBookmarked = $this.hasClass('bookmarked');

			try {
				if (isBookmarked) {
					await api.delete(`/topics/${topicId}/bookmark`);
					$this.removeClass('bookmarked').attr('title', 'Bookmark this topic');
				} else {
					await api.post(`/topics/${topicId}/bookmark`);
					$this.addClass('bookmarked').attr('title', 'Unbookmark this topic');
				}

				alerts.success(isBookmarked ? 'Topic unbookmarked' : 'Topic bookmarked');
			} catch (err) {
				alerts.error('Bookmark action failed. Please try again.');
			}
		});
	}

	function handleIgnoreWatch(cid) {
		$('[component="category/watching"], [component="category/tracking"], [component="category/ignoring"], [component="category/notwatching"]').on('click', function () {
			const $this = $(this);
			const state = $this.attr('data-state');

			api.put(`/categories/${cid}/watch`, { state }, (err) => {
				if (err) {
					return alerts.error(err);
				}

				$('[component="category/watching/menu"]').toggleClass('hidden', state !== 'watching');
				$('[component="category/watching/check"]').toggleClass('fa-check', state === 'watching');

				$('[component="category/tracking/menu"]').toggleClass('hidden', state !== 'tracking');
				$('[component="category/tracking/check"]').toggleClass('fa-check', state === 'tracking');

				$('[component="category/notwatching/menu"]').toggleClass('hidden', state !== 'notwatching');
				$('[component="category/notwatching/check"]').toggleClass('fa-check', state === 'notwatching');

				$('[component="category/ignoring/menu"]').toggleClass('hidden', state !== 'ignoring');
				$('[component="category/ignoring/check"]').toggleClass('fa-check', state === 'ignoring');

				alerts.success('[[category:' + state + '.message]]');
			});
		});
	}

	function handleLoadMoreSubcategories() {
		$('[component="category/load-more-subcategories"]').on('click', async function () {
			const btn = $(this);
			const { categories: data } = await api.get(`/categories/${ajaxify.data.cid}/children?start=${ajaxify.data.nextSubCategoryStart}`);
			btn.toggleClass('hidden', !data.length || data.length < ajaxify.data.subCategoriesPerPage);
			if (!data.length) {
				return;
			}
			app.parseAndTranslate('category', 'children', { children: data }, function (html) {
				html.find('.timeago').timeago();
				$('[component="category/subcategory/container"]').append(html);
				ajaxify.data.nextSubCategoryStart += ajaxify.data.subCategoriesPerPage;
				ajaxify.data.subCategoriesLeft -= data.length;
				btn.toggleClass('hidden', ajaxify.data.subCategoriesLeft <= 0)
					.translateText('[[category:x-more-categories, ' + ajaxify.data.subCategoriesLeft + ']]');
			});

			return false;
		});
	}

	Category.toTop = function () {
		navigator.scrollTop(0);
	};

	Category.toBottom = async () => {
		const { count } = await api.get(`/categories/${ajaxify.data.category.cid}/count`);
		navigator.scrollBottom(count - 1);
	};

	function loadTopicsAfter(after, direction, callback) {
		callback = callback || function () {};

		hooks.fire('action:topics.loading');
		const params = utils.params();
		infinitescroll.loadMore(`/categories/${ajaxify.data.cid}/topics`, {
			after: after,
			direction: direction,
			query: params,
			categoryTopicSort: params.sort || config.categoryTopicSort,
		}, function (data, done) {
			hooks.fire('action:topics.loaded', { topics: data.topics });
			callback(data, done);
		});
	}

	return Category;
});
