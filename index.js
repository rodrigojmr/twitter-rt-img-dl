'use strict';

const axios = require('axios');
const fs = require('fs');
const Path = require('path');
require('dotenv').config();

const lastDownload = require('./lastDownload.json');
const nomedia = require('./nomedia.json');

const token = process.env.BEARER_TOKEN;
const twitterUser = process.env.USER;

const api = axios.create({
  headers: {
    authorization: `Bearer ${token}`
  }
});

// The code below sets the bearer token from your environment variables
// To set environment variables on Mac OS X, run the export command below from the terminal:
// export BEARER_TOKEN='YOUR-TOKEN'

const endpointUrl = 'https://api.twitter.com/2/tweets/search/recent';

const params = {
  params: {
    query: `from:${twitterUser} is:retweet`,
    expansions: 'attachments.media_keys',
    'media.fields': 'url',
    'tweet.fields': 'attachments,author_id,created_at,referenced_tweets',
    max_results: '100'
  }
};

async function getRequest(params, nextToken) {
  if (nextToken) params.params.next_token = nextToken;

  try {
    const res = await api.get(endpointUrl, params);
    if (nextToken) {
      console.log('nextToken: ', nextToken);
    }
    return res.data;
  } catch (error) {
    throw new Error('Unsuccessful request');
  }
}

async function formatData(res) {
  const resToFormat = JSON.parse(JSON.stringify(res));
  for await (const tweet of resToFormat.data) {
    if (tweet.attachments) {
      tweet.attachments.media_keys = tweet.attachments.media_keys.map(key =>
        res.includes.media.find(obj => obj.media_key === key)
      );
    } else {
      const id = tweet.referenced_tweets[0].id;
      try {
        const tweetSingle = await singleTweet(id);
        tweet.attachments = { media_keys: [] };
        tweet.attachments.media_keys = JSON.parse(
          JSON.stringify(tweetSingle.includes.media)
        );
      } catch (error) {
        console.log(error);
      }
    }
  }
  return resToFormat.data;
}

async function singleTweet(id) {
  // debugger;
  const singleTweetParams = {
    params: {
      ids: id,
      expansions: 'attachments.media_keys',
      'media.fields': 'url',
      'tweet.fields': 'attachments,author_id,created_at'
    }
  };
  try {
    const res = await api.get(
      'https://api.twitter.com/2/tweets',
      singleTweetParams
    );
    return res.data;
  } catch (error) {
    console.log('single tweet error', error);
  }
}

const newTweetsExist = res => {
  return res.data.some(
    tweet => Date.parse(tweet.created_at) > Date.parse({ lastDownload })
  );
};

// * Optional write to fail if there are tweets with no media, deprecated with single tweet search
async function writeToFile(object, file) {
  return await fs.promises.writeFile(file, JSON.stringify(object, null, 2));
}

const tweetsArray = data => {
  return data.map(tweet => {
    const regex = /@(\w+)/g;
    const artist = tweet.text.match(regex)[0].slice(1);
    const imageUrl = tweet.attachments.media_keys.map(key => key.url);
    return {
      tweetId: tweet.id,
      artist,
      imageUrl,
      tweetUrl: `http://twitter.com/${artist}/status/${tweet.id}`
    };
  });
};

async function sleep(millis) {
  return new Promise(resolve => setTimeout(resolve, millis));
}

async function downloadFiles(tweets) {
  console.log(tweets.length);
  for (const tweet of tweets) {
    await Promise.all(
      tweet.imageUrl.map(async url => {
        const regex = /media\/(\w+)./;
        if (!url) return await storeTweet(tweet);
        const name = url.match(regex)[1];

        const dir = Path.join(
          __dirname,
          'images',
          `${tweet.artist}-${name}-twitter.jpg`
        );

        const fileExists = await fs.promises
          .access(dir)
          .then(() => true)
          .catch(() => false);

        if (!fileExists) {
          console.log('downloading');
          await downloadImage(url, dir);
        } else console.log('file exists');
      })
    );
    await sleep(200);
  }
}

async function storeTweet(tweet) {
  nomedia.tweets.push(tweet);
  return await writeToFile(nomedia, './nomedia.json');
}

async function downloadImage(url, dir) {
  const writer = fs.createWriteStream(dir);
  const response = await axios({
    url,
    method: 'GET',
    responseType: 'stream'
  });

  response.data.pipe(writer);

  return new Promise((resolve, reject) => {
    writer.on('finish', resolve);
    writer.on('error', reject);
  });
}

(async () => {
  try {
    let response = await getRequest(params);
    let allData = await formatData(response);
    while (response.meta.next_token && newTweetsExist(response)) {
      console.log('loop starts');
      console.log('response: ', response.meta);
      response = await getRequest(params, response.meta.next_token);
      let formattedData = await formatData(response);
      formattedData.forEach(tweet =>
        allData.push(JSON.parse(JSON.stringify(tweet)))
      );
      console.log('loop ends');
    }
    const tweets = tweetsArray(allData);
    await writeToFile(tweets, './alllastDownload.json');
    await downloadFiles(tweets);
    await writeToFile(
      {
        lastDownload: new Date().toISOString()
      },
      './lastDownload.json'
    );
  } catch (e) {
    console.log(e);
    process.exit(-1);
  }
  process.exit();
})();
