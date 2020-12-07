import { getRequest } from './requests';

const userRetweetsWithMedia = {
  params: {
    query: `from:${twitterUser} filter:nativeretweets`,
    expansions: 'attachments.media_keys',
    'media.fields': 'url',
    'tweet.fields': 'attachments,author_id,created_at,referenced_tweets',
    max_results: '100'
  }
};

const endpointUrl = 'https://api.twitter.com/2/tweets/search/recent';

test('API should work', () => {
  expect(getRequest(userRetweetsWithMedia));
});
