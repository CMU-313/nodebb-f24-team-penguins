'use strict';


const translatorApi = module.exports;

translatorApi.translate = async function (postData) {
	// Edit the translator URL below
	const TRANSLATOR_API = 'http://team-penguins-translator-service.azurewebsites.net/';
	const response = await fetch(`${TRANSLATOR_API}/?content=${postData.content}`);
	const data = await response.json();
	return [data.is_english, data.translated_content];
};
