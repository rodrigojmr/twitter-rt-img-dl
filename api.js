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
