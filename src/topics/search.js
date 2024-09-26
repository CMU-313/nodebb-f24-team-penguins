'use strict';

const winston = require('winston');
const db = require('../database');

module.exports = function (Topics) {
	Topics.searchTopics = async function (data) {
		const query = data.query || '';
		const cid = data.cid || null;

		winston.info(`Starting topic search with query: "${query}"`);

		const tids = await getAllTids();
		winston.info(`Found ${tids.length} topic IDs.`);

		const topicsData = await Topics.getTopicsData(tids);
		winston.info(`Retrieved topics data for ${topicsData.length} topics.`);

		const filteredByCid = filterTopicsByCid(topicsData, cid);

		const filteredTopics = filterTopicsByTitle(filteredByCid, query);

		const searchResult = {
			topics: filteredTopics,
			matchCount: filteredTopics.length,
		};

		winston.info(`Search result: ${searchResult.topics.length} topics returned, ${searchResult.matchCount} topics matched.`);

		return searchResult;
	};

	async function getAllTids() {
		const allTids = await db.getSortedSetRange('topics:tid', 0, -1);
		winston.info(`Retrieved all Tids: "${allTids.length}"`);
		return allTids.map(tid => parseInt(tid, 10));
	}

	function filterTopicsByCid(topicsData, cid) {
		if (!cid) {
			return topicsData;
		}
		return topicsData.filter(topic => topic && topic.cid === parseInt(cid, 10));
	}

	function filterTopicsByTitle(topicsData, query) {
		// If the query is empty or too short, return all topics
		if (!query || query.length < 2) {
			return topicsData;
		}
		const lowerCaseQuery = query.toLowerCase();
		return topicsData.filter(topic => topic && topic.title && topic.title.toLowerCase().includes(lowerCaseQuery));
	}
};
