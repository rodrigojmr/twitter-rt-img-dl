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
    const tweetHasMedia = tweet.attachments;
    if (tweetHasMedia) {
      tweet.attachments.media_keys = replaceMediaKeys(
        tweet,
        resCopy.includes.media
      );
    } else {
      const retweetedTweetId = tweet.referenced_tweets[0].id;
      try {
        const tweetSingle = await fetchSingleTweet(retweetedTweetId);
        tweet.attachments = { media_keys: [] };
        tweet.attachments.media_keys = JSON.parse(
          JSON.stringify(tweetSingle.includes.media)
        );
      } catch (error) {}
    }
  }
  return resCopy.data;
};

const deepCopy = obj => JSON.parse(JSON.stringify(obj));

export const replaceMediaKeys = (tweet, media) => {
  // Reaplces the id of media_key in the tweet
  // With the media object in includes with that media_key
  // This object contains the url needed to fetch the image
  return tweet.attachments.media_keys.map(key =>
    media.find(obj => obj.media_key === key)
  );
};
