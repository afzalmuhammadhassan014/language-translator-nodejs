'use strict';

const LanguageTranslatorV3 = require('ibm-watson/language-translator/v3');
const { IamAuthenticator } = require('ibm-watson/auth');
const SpeechToTextV1 = require('ibm-watson/speech-to-text/v1.js');
const TextToSpeechV1 = require('ibm-watson/text-to-speech/v1.js');
const { IamTokenManager } = require('ibm-watson/auth');
const { Cp4dTokenManager } = require('ibm-watson/auth');

// Create the service wrapper
const translator = new LanguageTranslatorV3({
    version: '2019-10-10',
    authenticator: new IamAuthenticator({
        apikey: process.env.LANGUAGE_TRANSLATOR_IAM_APIKEY,
    }),
    url: process.env.LANGUAGE_TRANSLATOR_URL,
    headers: {
        'X-Watson-Technology-Preview': '2018-05-01',
        'X-Watson-Learning-Opt-Out': true,
    },
});



const express = require('express');
const app = express();
const morgan = require('morgan');
const bodyParser = require('body-parser');
require('./config/express')(app);
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(morgan('dev'));

// Setup static public directory
app.use(express.static(__dirname + '/../public'));

// Bootstrap application settings

// Bootstrap application settings

const vcapServices = require('vcap_services');
var fs = require('fs'),
    ejs = require('ejs'),
    http = require('http'),
    server, filePath;


let sttUrl = process.env.SPEECH_TO_TEXT_URL;

// Ensure we have a SPEECH_TO_TEXT_AUTH_TYPE so we can get a token for the UI.
let sttAuthType = process.env.SPEECH_TO_TEXT_AUTH_TYPE;
if (!sttAuthType) {
    sttAuthType = 'iam';
} else {
    sttAuthType = sttAuthType.toLowerCase();
}
// Get a token manager for IAM or CP4D.
let tokenManager = false;
if (sttAuthType === 'cp4d') {
    tokenManager = new Cp4dTokenManager({
        username: process.env.SPEECH_TO_TEXT_USERNAME,
        password: process.env.SPEECH_TO_TEXT_PASSWORD,
        url: process.env.SPEECH_TO_TEXT_AUTH_URL,
        disableSslVerification: process.env.SPEECH_TO_TEXT_AUTH_DISABLE_SSL || false
    });
} else if (sttAuthType === 'iam') {
    let apikey = process.env.SPEECH_TO_TEXT_APIKEY;
    if (!(apikey && sttUrl)) {
        // If no runtime env override for both, then try VCAP_SERVICES.
        const vcapCredentials = vcapServices.getCredentials('speech_to_text');
        // Env override still takes precedence.
        apikey = apikey || vcapCredentials.apikey;
        sttUrl = sttUrl || vcapCredentials.url;
    }
    tokenManager = new IamTokenManager({ apikey });
} else if (sttAuthType === 'bearertoken') {
    console.log('SPEECH_TO_TEXT_AUTH_TYPE=bearertoken is for dev use only.');
} else {
    console.log('SPEECH_TO_TEXT_AUTH_TYPE =', sttAuthType);
    console.log('SPEECH_TO_TEXT_AUTH_TYPE is not recognized.');
}

// Init the APIs using environment-defined auth (default behavior).
const speechToText = new SpeechToTextV1({ version: '2019-12-16' });
const languageTranslator = new LanguageTranslatorV3({ version: '2019-12-16' });
const textToSpeech = new TextToSpeechV1({ version: '2019-12-16' });

let speechModels = [];
speechToText
    .listModels()
    .then(response => {
        speechModels = response.result.models; // The whole list
        // Filter to only show one band.
        speechModels = response.result.models.filter(model => model.rate > 8000); // TODO: Make it a .env setting
        // Make description be `[lang] description` so the sort-by-lang makes sense.
        speechModels = speechModels.map(m => ({...m, description: `[${m.language}]  ${m.description}` }));
        speechModels.sort(function(a, b) { // eslint-disable-line
            // Sort by 1 - language, 2 - description.
            return a.language.localeCompare(b.language) || a.description.localeCompare(b.description);
        });
    })
    .catch(err => {
        console.log('error: ', err);
    });

// Get supported language translation targets
const modelMap = {};
languageTranslator
    .listModels()
    .then(response => {
        for (const model of response.result.models) { // eslint-disable-line
            const { source, target } = model;
            if (!(source in modelMap)) {
                modelMap[source] = new Set([target]);
            } else {
                modelMap[source].add(target);
            }
        }
        // Turn Sets into arrays.
        for (const k in modelMap) { // eslint-disable-line
            modelMap[k] = Array.from(modelMap[k]);
        }
    })
    .catch(err => {
        console.log('error: ', err);
    });

// Get supported source language for Speech to Text
let voices = [];
textToSpeech
    .listVoices()
    .then(response => {
        // There are many redundant voices. For now the V3 ones are the best ones.
        voices = response.result.voices.filter(voice => voice.name.includes('V3')); // TODO: env param.
    })
    .catch(err => {
        console.log('error: ', err);
    });


const getFileExtension = acceptQuery => {
    const accept = acceptQuery || '';
    switch (accept) {
        case 'audio/ogg;codecs=opus':
        case 'audio/ogg;codecs=vorbis':
            return 'ogg';
        case 'audio/wav':
            return 'wav';
        case 'audio/mpeg':
            return 'mpeg';
        case 'audio/webm':
            return 'webm';
        case 'audio/flac':
            return 'flac';
        default:
            return 'mp3';
    }
};

app.get('/', (req, res) => {
    res.render('login.ejs');
});

app.get('/speech_translation', (req, res) => {
    res.render('speech_translation');
});

// Get credentials using your credentials
app.get('/api/v1/credentials', async(req, res, next) => {
    if (tokenManager) {
        try {
            const accessToken = await tokenManager.getToken();
            res.json({
                accessToken,
                serviceUrl: sttUrl
            });
        } catch (err) {
            console.log('Error:', err);
            next(err);
        }
    } else if (process.env.SPEECH_TO_TEXT_BEARER_TOKEN) {
        res.json({
            accessToken: process.env.SPEECH_TO_TEXT_BEARER_TOKEN,
            serviceUrl: sttUrl
        });
    } else {
        console.log('Failed to get a tokenManager or a bearertoken.');
    }
});

/**
 * Language Translator
 */
app.get('/api/v1/translate', async(req, res) => {
    const inputText = req.query.text;

    const ltParams = {
        text: inputText,
        source: req.query.source.substring(0, 2),
        target: req.query.voice.substring(0, 2)
    };

    const doTranslate = ltParams.source !== ltParams.target;

    try {
        // Use language translator only when source language is not equal target language
        if (doTranslate) {
            const ltResult = await languageTranslator.translate(ltParams);
            req.query.text = ltResult.result.translations[0].translation;
        } else {
            // Same language, skip LT, use input text.
            req.query.text = inputText;
        }

        console.log('TRANSLATED:', inputText, ' --->', req.query.text);
        res.json({ translated: req.query.text });
    } catch (error) {
        console.log(error);
        res.send(error);
    }
});

/**
 * Pipe the synthesize method
 */
app.get('/api/v3/synthesize', async(req, res, next) => {
    try {
        console.log('TEXT-TO-SPEECH:', req.query.text);
        const { result } = await textToSpeech.synthesize(req.query);
        const transcript = result;
        transcript.on('response', response => {
            if (req.query.download) {
                response.headers['content-disposition'] = `attachment; filename=transcript.${getFileExtension(req.query.accept)}`;
            }
        });
        transcript.on('error', next);
        transcript.pipe(res);
    } catch (error) {
        console.log(error);
        res.send(error);
    }
});

app.get('/api/v2/voices', async(req, res, next) => {
    try {
        const { result } = textToSpeech.listVoices();
        res.json(result);
    } catch (error) {
        next(error);
    }
});

app.get('/text-to-speech', function(req, res) {
    res.render('text-to-speech', {
        hideHeader: !!(req.query.hide_header == 'true' || req.query.hide_header == '1'),
    });
});

// Return the models, voices, and supported translations.
app.get('/api/v1/voices', async(req, res, next) => {
    try {
        res.json({
            modelMap,
            models: speechModels,
            voices
        });
    } catch (error) {
        next(error);
    }
});
// render index page
app.get('/text-translation', function(req, res) {
    // If hide_header is found in the query string and is set to 1 or true,
    // the header should be hidden. Default is to show header
    res.render('text-translation.ejs', {
        hideHeader: !!(req.query.hide_header == 'true' || req.query.hide_header == '1'),
    });
});

app.get('/api/models', function(req, res, next) {
    console.log('/v3/models');
    translator
        .listModels()
        .then(({ result }) => res.json(result))
        .catch(error => next(error));
});

app.post('/api/identify', function(req, res, next) {
    console.log('/v3/identify');
    translator
        .identify(req.body)
        .then(({ result }) => res.json(result))
        .catch(error => next(error));
});

app.get('/api/identifiable_languages', function(req, res, next) {
    console.log('/v3/identifiable_languages');
    translator
        .listIdentifiableLanguages(req.body)
        .then(({ result }) => res.json(result))
        .catch(error => next(error));
});

app.post('/api/translate', function(req, res, next) {
    console.log('/v3/translate');
    translator
        .translate(req.body)
        .then(({ result }) => res.json(result))
        .catch(error => next(error));
});

// express error handler
require('./config/error-handler')(app);
module.exports = app;