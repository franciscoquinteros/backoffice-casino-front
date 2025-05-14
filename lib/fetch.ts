import { getSession } from "next-auth/react";

export async function fetchWithAuth(url: string, options: RequestInit = {}) {
    const session = await getSession();

    const headers = {
        ...options.headers,
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session?.accessToken}`,
    };

    const response = await fetch(url, {
        ...options,
        headers,
    });

    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
} 