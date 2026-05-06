import { mockBooks } from '../data/mockBooks';

const fetchBooks = async () => {
  try {
    const res = await api.get('/books');
    setBooks(res.data);
  } catch {
    setBooks(mockBooks); // fallback
  }
};

export const mockStats = {
  books: 3,
  bookings: 5,
};