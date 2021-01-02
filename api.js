'use strict';
import dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();

const token = process.env.BEARER_TOKEN;

const api = axios.create({
  headers: {
    authorization: `Bearer ${token}`
  }
});

export default api;

export const recentRequest = async (query, nextToken) => {
  const twitterRecentEndpoint =
    'https://api.twitter.com/2/tweets/search/recent';

  if (nextToken) query.params.next_token = nextToken;

  try {
    const res = await api.get(twitterRecentEndpoint, query);
    return res.data;
  } catch (error) {
    console.log({ error });
    throw new Error('Unsuccessful request');
  }
};

export const fetchSingleTweet = async id => {
  // debugger;
  const singleTweetEndpoint = 'https://api.twitter.com/2/tweets';
  const params = {
    params: {
      ids: id,
      expansions: 'attachments.media_keys',
      'media.fields': 'url',
      'tweet.fields': 'attachments,author_id,created_at'
    }
  };
  try {
    const res = await api.get(singleTweetEndpoint, params);
    return res.data;
  } catch (error) {
    console.log('single tweet error', error);
  }
};
