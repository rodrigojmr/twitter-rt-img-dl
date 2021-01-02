const twitterUser = process.env.USER;

export const retweetsWithMedia = {
  params: {
    // query: `from:${twitterUser} filter:nativeretweets`
    query: `from:${twitterUser} is:retweet`,
    expansions: 'attachments.media_keys',
    'media.fields': 'url',
    'tweet.fields': 'attachments,author_id,created_at,referenced_tweets',
    max_results: '100'
  }
};
