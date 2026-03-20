export const readResponsePayload = async (response) => {
    const contentType = response.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
        try {
            return await response.json();
        } catch {
            return {};
        }
    }

    const text = await response.text();
    return {
        raw: text,
        error: text ? text.slice(0, 240) : '',
    };
};
