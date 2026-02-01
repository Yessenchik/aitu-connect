// static/script.js
function apiPost(url, data, callback) {
    fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    })
        .then(res => {
            if (!res.ok) throw new Error('Error');
            return res.json();
        })
        .then(() => callback())
        .catch(err => alert(err.message));
}