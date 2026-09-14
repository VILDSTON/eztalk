import { io } from "socket.io-client";

const socket = io("http://localhost:5050");

socket.on("connect", () => {
  console.log("Connected to server:", socket.id);
  
  // Authenticate to bypass unauth timeout
  socket.emit("authenticate", { handle: "@test_ess_user" });

  // Spam 20 packets to trigger rate limit (capacity is 5, so 6th should trigger warning)
  console.log("Spamming 20 packets...");
  for (let i = 0; i < 20; i++) {
    socket.emit("some_random_event", { data: i });
  }

  // Wait to see if we get disconnected (should not, since ALPHA_DRY_RUN = true)
  setTimeout(() => {
    console.log("Test finished. Disconnecting.");
    socket.disconnect();
    process.exit(0);
  }, 2000);
});

socket.on("connect_error", (err) => {
  console.error("Connection error:", err.message);
  process.exit(1);
});

socket.on("disconnect", (reason) => {
  console.log("Disconnected:", reason);
});
