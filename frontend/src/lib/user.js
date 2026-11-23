import axios from "axios";
import {BASE_URL} from "./config.js";

export function register ({name, email, password}) {
    return axios.post(`${BASE_URL}/register`, {name, email, password});
}

export function login ({email, password}) {
    return axios.post(`${BASE_URL}/login`, {email, password});
}

export function changePassword({ currentPassword, newPassword}, token) {
    return axios.post(`${BASE_URL}/change-password`, {currentPassword, newPassword}, {
        headers: {
            Authorization: `Bearer ${token}`
        } },
    )}

export function forgotPassword(email) {
    return axios.post(`${BASE_URL}/forgot-password`, {email});
}

export function resetPassword(token, newPassword) {
    return axios.post(`${BASE_URL}/reset-password/${token}`, { newPassword });
}
