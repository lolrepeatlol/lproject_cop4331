export function storeToken(tok) {
    try {
        // Ensure the token object and its accessToken property exist before storing
        if (tok && tok.accessToken) {
            localStorage.setItem('token_data', tok.accessToken);
        }
    } catch (e) {
        console.error("Error storing token:", e);
    }
}

export function retrieveToken() {
    let ud;
    try {
        ud = localStorage.getItem('token_data');
    } catch (e) {
        console.error("Error retrieving token:", e);
        ud = null; // Ensure function returns null on error
    }
    return ud;
}