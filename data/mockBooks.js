import { mockBooks } from '../data/mockBooks';

const fetchBooks = async () => {
  try {
    const res = await api.get('/books');
    setBooks(res.data);
  } catch {
    setBooks(mockBooks); // fallback
  }
};
export const mockBooks = [
  { id: 1, title: "Clean Code", author: "Robert Martin" },
  { id: 2, title: "Physics Basics", author: "Newton" },
];