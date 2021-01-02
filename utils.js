import { fetchSingleTweet } from './api.js';

export const readJson = (path, cb) => {
  fs.readFile(require.resolve(path), (err, data) => {
    if (err) cb(err);
    else cb(null, JSON.parse(data));
  });
};

export const formatData = async res => {
  const resCopy = deepCopy(res);

  for await (const tweet of resCopy.data) {
    const tweetHasMedia = tweet.hasOwnProperty('attachments');
    if (tweetHasMedia) {
      // tweet.urls = mapMediaKeys(tweet, resCopy.includes.media);
      tweet.urls = tweet.attachments.media_keys.map(
        key => resCopy.includes.media.find(obj => obj.media_key === key).url
      );
    } else {
      const retweetedTweetId = tweet.referenced_tweets[0].id;
      try {
        const singleTweet = await fetchSingleTweet(retweetedTweetId);
        if (!singleTweet.includes) continue;
        tweet.urls = singleTweet.includes.media.url || undefined;
      } catch (error) {
        throw new Error('Format failed');
      }
    }
  }
  return resCopy.data;
};

const deepCopy = obj => JSON.parse(JSON.stringify(obj));

// export const mapMediaKeys = (tweet, mediaArr) => {
//   // Reaplces the id of media_key in the tweet
//   // With the media object in includes with that media_key
//   // This object contains the url needed to fetch the image
//   return tweet.attachments.media_keys.map(key =>
//     mediaArr.find(obj => obj.media_key === key)
//   );
// };
