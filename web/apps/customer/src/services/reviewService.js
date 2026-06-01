import axiosClient from '../api/axiosClient';

export const reviewService = {
  getByProperty: (propertyId) => {
    return axiosClient.get(`/api/reviews/property/${propertyId}`);
  },

  createReview: (bookingId, reviewData) => {
    return axiosClient.post(`/api/reviews/${bookingId}`, reviewData);
  },
};
