export async function fetchJSON(url, options = {}) {
  const fetchOptions = {
    method: options.method || "GET",
    headers: {
      ...options.headers,
    },
  };

  if (fetchOptions.method !== "GET" && options.body) {
    fetchOptions.headers["Content-Type"] = "application/json";
    fetchOptions.body = JSON.stringify(options.body);
  }

  const res = await fetch(url, fetchOptions);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  return await res.json();
}

export async function fetchForm(url, form) {
  const payload = Object.fromEntries(new FormData(form));

  console.log(payload);
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Requested-With": "fetch"
    },
    body: JSON.stringify(payload),
    credentials: "same-origin"
  });

  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}


