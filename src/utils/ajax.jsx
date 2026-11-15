import axios from "axios";
import { clearSession, getAccessToken, setAccessToken } from "../lib/session";

// vite.config.js 의 proxy 가 /api 를 Spring Boot(localhost:10000)로 넘긴다
const ajax = axios.create({
    baseURL: '/api',
    withCredentials: true,
});

// 요청마다 localStorage 의 JWT 를 Authorization 헤더로 보낸다
ajax.interceptors.request.use(
    (config) => {
        const token = getAccessToken();

        if(token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

let isLoggingOut = false;

ajax.interceptors.response.use(
    response => {
        // 액세스 토큰이 만료되어 백엔드가 리프레시 토큰으로 재발급한 경우 헤더로 새 토큰이 온다
        const renewed = response.headers?.authorization;
        if (renewed && renewed.startsWith("Bearer ")) {
            setAccessToken(renewed.substring(7));
        }
        return response;
    },
    async error => {
        const status = error.response?.status;
        // 토큰을 보낸 요청이 401 이면 로그인이 풀린 것. (로그인 실패 401 은 화면에서 처리)
        const sentToken = Boolean(error.config?.headers?.Authorization);
        const isLoginRequest = error.config?.url?.startsWith("/auth/login");

        if(status === 401 && sentToken && !isLoginRequest && !isLoggingOut) {
            isLoggingOut = true;

            clearSession();

            alert("시간이 너무 지나서 자동 로그아웃 되었어요! 다시 로그인 해주세요!");
            window.location.href = "/member/login";
        }

        return Promise.reject(error);
    }
)

export const getData = async (endpoint, config = {}) => {
    try {
        const response = await ajax.get(endpoint, config);
        return response;
    } catch (error) {
        console.error('Error fetching data:', error);
        throw error;
    }
};

export const postData = async (endpoint, data = {}) => {
    try {
        const response = await ajax.post(endpoint, data);
        const { data: resData, status } = response;
        return { data: resData, status };
    } catch (error) {
        console.error("Error Post data:", error);
        throw error;
    }
};

export const deleteData = async (endpoint, config = {}) => {
    try {
        const response = await ajax.delete(endpoint, config);
        return response;
    } catch (error) {
        console.log("Error Delete data:", error);
        throw error;
    }
}

export default ajax;
