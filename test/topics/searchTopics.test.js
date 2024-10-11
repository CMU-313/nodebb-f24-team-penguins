'use strict';

// Install: npm install mocha chai sinon --save-dev
// Run General: npm test
// Run Specific: npx mocha test/topics/searchTopics.test.js

const { expect } = require('chai');
const sinon = require('sinon');

// Static import instead of dynamic
const Topics = require('../../src/api/topics');

describe('Topics search API', () => {
	let topicsFieldsStub;
	let topicsStub;

	beforeEach(() => {
		// Stub Topics methods directly
		topicsFieldsStub = sinon.stub(Topics, 'getTopicsFields');
		topicsStub = sinon.stub(Topics, 'getTopics');
	});

	afterEach(() => {
		// Restore original methods
		sinon.restore();
	});

	it('should return an empty result if no query is provided', async function () {
		this.timeout(30000); // Increase timeout for this test

		// Arrange
		const data = { query: '' };
		topicsFieldsStub.resolves([]); // Mock empty response
		topicsStub.resolves([]); // Mock empty response

		// Act
		const result = await Topics.searchTopics(data);

		// Assert
		expect(result.matchCount).to.equal(0);
		/* eslint-disable no-unused-expressions */
		expect(result.topics).to.be.an('array').that.is.empty;
		/* eslint-enable no-unused-expressions */
	});

	it('should return matching topics based on the query', async () => {
		// Arrange
		const data = { query: 'test' };
		const mockTitles = [{ title: 'NodeBB' }, { title: 'Welcome' }];
		const mockTopics = [
			{ tid: 1, title: 'Welcome to your NodeBB' },
			{ tid: 2, title: 'Welcome to your NodeBBc' },
		];

		topicsFieldsStub.resolves(mockTitles); // Mock Topics.getTopicsFields response
		topicsStub.resolves(mockTopics); // Mock Topics.getTopics response

		// Act
		const result = await Topics.searchTopics(data);

		// Assert
		expect(result.topics).to.be.an('array').that.has.lengthOf(2);
		expect(result.topics[0].title).to.equal('Welcome to your NodeBB');
		expect(result.topics[1].title).to.equal('Welcome to your NodeBBc');
		expect(result.matchCount).to.equal(2);
	});

	it('should return an empty result if no topics match the query', async () => {
		// Arrange
		const data = { query: 'nonexistent' };
		topicsFieldsStub.resolves([{ title: 'Annie' }, { title: 'Penguins' }]); // Mock unrelated topics
		topicsStub.resolves([]); // Mock no matching topics

		// Act
		const result = await Topics.searchTopics(data);

		// Assert
		expect(result.matchCount).to.equal(0);
		/* eslint-disable no-unused-expressions */
		expect(result.topics).to.be.an('array').that.is.empty;
		/* eslint-enable no-unused-expressions */
	});
});
