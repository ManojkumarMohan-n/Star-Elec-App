import { useEffect, useState } from "react";

export default function SettingsPage() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch("http://localhost:8000/settings", {
          headers: {
            "Content-Type": "application/json",
            // Add token if required
            // Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        });

        if (!res.ok) {
          throw new Error("Failed to fetch settings");
        }

        const data = await res.json();
        setSettings(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  if (loading) return <div>Loading settings...</div>;
  if (error) return <div style={{ color: "red" }}>{error}</div>;

  return (
    <div style={{ padding: "20px" }}>
      <h2>Settings</h2>

      <div style={cardStyle}>
        <p><strong>Shop Name:</strong> {settings.shop_name}</p>
        <p><strong>GST Rate:</strong> {settings.gst_rate}%</p>
        <p><strong>Currency:</strong> {settings.currency}</p>
      </div>
    </div>
  );
}

const cardStyle = {
  marginTop: "20px",
  padding: "15px",
  border: "1px solid #ccc",
  borderRadius: "8px",
  width: "300px",
  background: "#f9f9f9",
};
