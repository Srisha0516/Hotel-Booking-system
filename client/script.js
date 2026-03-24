const API = "http://localhost:5000/api";

// Example: fetch rooms
async function getRooms() {
  const res = await fetch(`${API}/rooms`);
  const data = await res.json();
  console.log(data);
}