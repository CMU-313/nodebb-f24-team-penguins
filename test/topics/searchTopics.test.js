'use strict';
// Install: npm install mocha chai sinon --save-dev
// Run General: npm test
// Run Specific: npx mocha test/topics/searchTopics.test.js

// This code is modified from ChatGPT

describe('Topics search API', async function() {
    const { expect } = await import('chai');
    const sinon = await import('sinon');
    const db = await import('../database');

    let dbStub, topicsStub, Topics, searchModule;

    before(async function() {
        // Dynamic import of Topics and search module
        Topics = await import('./index').then(mod => mod.default);
        searchModule = await import('../../src/topics/search').then(mod => mod.default(Topics));
    });

    beforeEach(function () {
        // Stub db and Topics methods
        dbStub = sinon.stub(db, 'getSetMembers');
        topicsStub = sinon.stub(Topics, 'getTopicsFields');
        sinon.stub(Topics, 'getTopics');
    });

    afterEach(function () {
        // Restore original methods
        sinon.restore();
    });

    it('should return an empty result if no query is provided', async function () {
        // Arrange
        const data = { query: '' };
        dbStub.resolves([]);  // Mock empty response
        topicsStub.resolves([]);

        // Act
        const result = await Topics.searchTopics(data);

        // Assert
        expect(result.topics).to.be.an('array').that.is.empty;
        expect(result.matchCount).to.equal(0);
    });

    it('should return matching topics based on the query', async function () {
        // Arrange
        const data = { query: 'test' };
        const mockTids = ['1', '2'];
        const mockTitles = [{ title: 'NodeBB' }, { title: 'Welcome' }];
        const mockTopics = [{ tid: 1, title: 'Welcome to your NodeBB' }, { tid: 2, title: 'Welcome to your NodeBBc' }];

        dbStub.resolves(mockTids);  // Mock db.getSetMembers response
        topicsStub.resolves(mockTitles);  // Mock Topics.getTopicsFields response
        Topics.getTopics.resolves(mockTopics);  // Mock Topics.getTopics response

        // Act
        const result = await Topics.searchTopics(data);

        // Assert
        expect(result.topics).to.be.an('array').that.has.lengthOf(2);
        expect(result.topics[0].title).to.equal('Welcome to your NodeBB');
        expect(result.topics[1].title).to.equal('Welcome to your NodeBB');
        expect(result.matchCount).to.equal(2);
    });

    it('should return an empty result if no topics match the query', async function () {
        // Arrange
        const data = { query: 'nonexistent' };
        dbStub.resolves(['1', '2']);
        topicsStub.resolves([{ title: 'Annie' }, { title: 'Penguins' }]);
        Topics.getTopics.resolves([{ tid: 1, title: '' }, { tid: 2, title: '' }]);

        // Act
        const result = await Topics.searchTopics(data);

        // Assert
        expect(result.topics).to.be.an('array').that.is.empty;
        expect(result.matchCount).to.equal(0);
    });
});