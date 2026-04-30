import axiosInstance from './axios';

export const getUserProfile = async (userId) => {
  try {
    const response = await axiosInstance.get(`/users/${userId}`);
    return response.data.user;
  } catch (error) {
    console.error('Error fetching user profile:', error);
    throw error;
  }
};
