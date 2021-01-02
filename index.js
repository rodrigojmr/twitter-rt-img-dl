'use strict';
import dotenv from 'dotenv';
import axios from 'axios';
import fs from 'fs';
import Path, { dirname } from 'path';
import move from 'move-file';
import lastDownload from './lastDownload.json';
import nomedia from './nomedia.json';

import { formatData } from './utils.js';

import { recentRequest, fetchSingleTweet } from './api.js';
import { retweetsWithMedia } from './queries.js';

dotenv.config();

const newTweetsExist = res => {
  return res.data.some(
    tweet => Date.parse(tweet.created_at) > Date.parse(lastDownload.date)
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
      tweetUrl: `http://twitter.com/${artist}/status/${tweet.id}`,
      createdAt: tweet.created_at
    };
  });
};

async function sleep(millis) {
  return new Promise(resolve => setTimeout(resolve, millis));
}

async function downloadFiles(tweets) {
  console.log(tweets.length);
  for (const tweet of tweets) {
    if (Date.parse(tweet.createdAt) < Date.parse(lastDownload.date)) {
      console.log('old tweet');
      continue;
    }
    await Promise.all(
      tweet.imageUrl.map(async url => {
        const regex = /media\/(\w+)./;
        if (!url) return await storeTweet(tweet);
        const name = url.match(regex)[1];

        const dir = Path.join(
          './images',
          `${tweet.artist}-${name}-twitter.jpg`
        );
        const fileExists = await fs.promises
          .access(dir)
          .then(() => true)
          .catch(() => false);

        if (!fileExists) {
          await downloadImage(url, dir);
        } else console.log('file exists');
      })
    );
  }
}

async function storeTweet(tweet) {
  nomedia.tweets.push(tweet);
  return await writeToFile(nomedia, './nomedia.json');
}

async function downloadImage(url, dir) {
  console.log('sleep for 3s');
  await sleep(3000);
  const writer = fs.createWriteStream(dir);

  try {
    console.log('downloading');
    const response = await axios({
      url,
      method: 'GET',
      responseType: 'stream'
    });
    if (response) {
      console.log('downloaded');
    } else throw new Error('Download failed.');

    response.data.pipe(writer);
    return new Promise((resolve, reject) => {
      writer.on('finish', resolve);
      writer.on('error', reject);
    });
  } catch (error) {
    console.log({ error });
  }
}

// const moveFiles = () => {
//   const currentPath = Path.join('./images');
//   const destinationPath = Path.join(
//     'C:',
//     'Users',
//     'rodri',
//     'Pictures',
//     'unsorted'
//   );
//   fs.readdir(currentPath, (err, files) => {
//     console.log('files: ', files);
//     if (err) console.log(err);
//     else {
//       console.log('\nCurrent directory filenames:');
//       files.forEach(file => {
//         console.log(file);
//       });
//     }
//   });
// };

(async () => {
  try {
    let response = await recentRequest(retweetsWithMedia);
    let allData = await formatData(response);

    while (response.meta.next_token && newTweetsExist(response)) {
      console.log('loop starts');
      console.log('response: ', response.meta);
      response = await recentRequest(
        retweetsWithMedia,
        response.meta.next_token
      );
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
        date: new Date().toISOString()
      },
      './lastDownload.json'
    );
    // moveFiles();
  } catch (e) {
    console.log(e);
    process.exit(-1);
  }
  process.exit();
})();
