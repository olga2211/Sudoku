import axios from 'axios';

const API_URL = 'http://localhost:5000';

// Debug interceptor to log requests
axios.interceptors.request.use(request => {
  console.log('Request Headers:', request.headers);
  return request;
});

// Add response interceptor to handle token expiration
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', {
      status: error.response?.status,
      data: error.response?.data,
      headers: error.response?.headers,
      config: {
        url: error.config?.url,
        headers: error.config?.headers
      }
    });

    if (error.response?.status === 401 || error.response?.status === 422) {
      // Token expired, invalid, or missing
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

const getAuthHeader = () => {
  const token = localStorage.getItem('token');
  if (!token) {
    throw new Error('No token found');
  }
  return {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  };
};

export const saveGame = async (boardState, isCompleted = false, gameId = null, elapsedTime = 0) => {
  try {
    const response = await axios.post(`${API_URL}/save_game`, {
      board_state: boardState,
      is_completed: isCompleted,
      game_id: gameId,
      elapsed_time: elapsedTime
    }, getAuthHeader());
    return response.data;
  } catch (error) {
    console.error('Save game error:', error);
    throw error;
  }
};

export const getAllGames = async () => {
  try {
    const response = await axios.get(`${API_URL}/games`, getAuthHeader());
    return response.data;
  } catch (error) {
    console.error('Get games error:', error);
    throw error;
  }
};

export const getGame = async (id) => {
  try {
    const response = await axios.get(`${API_URL}/game/${id}`, getAuthHeader());
    return response.data;
  } catch (error) {
    console.error('Get game error:', error);
    throw error;
  }
};

export const deleteGame = async (id) => {
  try {
    const response = await axios.delete(`${API_URL}/delete_game/${id}`, getAuthHeader());
    return response.data;
  } catch (error) {
    console.error('Delete game error:', error);
    throw error;
  }
}; 