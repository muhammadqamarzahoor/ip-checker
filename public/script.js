const API_URL =
  window.location.hostname === "localhost"
    ? "http://localhost:3000/api"
    : "https://ip-checker-tau.vercel.app/api";

// Validate IPv4 address
function isValidIP(ip) {
  const ipv4Regex =
    /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  return ipv4Regex.test(ip);
}

// Show notification
function showNotification(message, type = "info") {
  const container = document.getElementById("notification-container");
  container.innerHTML = "";

  const notification = document.createElement("div");
  notification.className = `notification ${type}`;

  let icon = "";
  if (type === "success") icon = "✅";
  else if (type === "warning") icon = "⚠️";
  else if (type === "error") icon = "❌";
  else icon = "ℹ️";

  notification.innerHTML = `
    <span class="notification-icon">${icon}</span>
    <span class="notification-message">${message}</span>
    <button class="notification-close-btn">✕</button>
  `;

  container.appendChild(notification);

  const closeBtn = notification.querySelector(".notification-close-btn");
  closeBtn.addEventListener("click", () => {
    notification.classList.remove("show");
    setTimeout(() => notification.remove(), 300);
  });

  setTimeout(() => notification.classList.add("show"), 10);
  return notification;
}

async function updateStats() {
  try {
    const res = await fetch(`${API_URL}/stats`);
    const data = await res.json();
    document.getElementById("successCount").textContent = data.successful;
    document.getElementById("duplicateCount").textContent = data.duplicateCount;
  } catch (error) {
    console.error("Error updating stats:", error);
  }
}

document.getElementById("checkBtn").addEventListener("click", async () => {
  const ip = document.getElementById("ipInput").value.trim();
  if (!ip) {
    showNotification("Please enter an IP address.", "error");
    return;
  }

  if (!isValidIP(ip)) {
    showNotification(
      "Invalid IP format. Please enter a valid IPv4 (e.g., 192.168.1.1)",
      "error"
    );
    return;
  }

  try {
    const res = await fetch(`${API_URL}/check`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ip }),
    });
    const data = await res.json();

    let notification;
    if (data.status === "added") {
      notification = showNotification("New IP added successfully!", "success");
    } else if (data.status === "duplicate") {
      notification = showNotification("Duplicate IP detected!", "warning");
    }

    setTimeout(() => {
      updateStats();
      if (notification && !notification.classList.contains("show")) {
        notification.classList.add("show");
      }
    }, 1000);
  } catch (error) {
    console.error(error);
    showNotification("Could not connect to backend.", "error");
  }
});

function updateToday() {
  const today = new Date().toISOString().split("T")[0];
  document.getElementById("today").textContent = today;
}

function updateCountdown() {
  const now = new Date();
  const resetTime = new Date();
  resetTime.setHours(6, 0, 0, 0);
  if (now > resetTime) resetTime.setDate(resetTime.getDate() + 1);
  const diff = resetTime - now;
  const hrs = String(Math.floor(diff / (1000 * 60 * 60))).padStart(2, "0");
  const mins = String(Math.floor((diff / (1000 * 60)) % 60)).padStart(2, "0");
  const secs = String(Math.floor((diff / 1000) % 60)).padStart(2, "0");
  document.getElementById("countdown").textContent = `${hrs}:${mins}:${secs}`;
}

setInterval(updateCountdown, 1000);
updateStats();
updateToday();
