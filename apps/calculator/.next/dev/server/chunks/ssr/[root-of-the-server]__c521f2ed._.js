module.exports = [
"[externals]/next/dist/compiled/next-server/app-page-turbo.runtime.dev.js [external] (next/dist/compiled/next-server/app-page-turbo.runtime.dev.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js", () => require("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js"));

module.exports = mod;
}),
"[project]/Documents/Dev/personal/equinox-galactic/apps/calculator/src/firebase.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "app",
    ()=>app
]);
// Import the functions you need from the SDKs you need
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Dev$2f$personal$2f$equinox$2d$galactic$2f$node_modules$2f$firebase$2f$app$2f$dist$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/Documents/Dev/personal/equinox-galactic/node_modules/firebase/app/dist/index.mjs [app-ssr] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Dev$2f$personal$2f$equinox$2d$galactic$2f$node_modules$2f40$firebase$2f$app$2f$dist$2f$esm$2f$index$2e$esm$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/Dev/personal/equinox-galactic/node_modules/@firebase/app/dist/esm/index.esm.js [app-ssr] (ecmascript)");
;
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries
// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
    apiKey: ("TURBOPACK compile-time value", "AIzaSyA3x3NYG7HWVwkeXlcQTVH6T4IA9F2_2T4"),
    authDomain: ("TURBOPACK compile-time value", "equinox-galactic.firebaseapp.com"),
    projectId: ("TURBOPACK compile-time value", "equinox-galactic"),
    appId: ("TURBOPACK compile-time value", "1:534200641170:web:fef6df37289c8019aee84b"),
    messagingSenderId: ("TURBOPACK compile-time value", "534200641170"),
    storageBucket: ("TURBOPACK compile-time value", "equinox-galactic.firebasestorage.app")
};
const app = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Dev$2f$personal$2f$equinox$2d$galactic$2f$node_modules$2f40$firebase$2f$app$2f$dist$2f$esm$2f$index$2e$esm$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["initializeApp"])(firebaseConfig);
}),
"[project]/Documents/Dev/personal/equinox-galactic/apps/calculator/src/components/AppCheckInit.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>AppCheckInit
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Dev$2f$personal$2f$equinox$2d$galactic$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/Dev/personal/equinox-galactic/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Dev$2f$personal$2f$equinox$2d$galactic$2f$node_modules$2f$firebase$2f$app$2d$check$2f$dist$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/Documents/Dev/personal/equinox-galactic/node_modules/firebase/app-check/dist/index.mjs [app-ssr] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Dev$2f$personal$2f$equinox$2d$galactic$2f$node_modules$2f40$firebase$2f$app$2d$check$2f$dist$2f$esm$2f$index$2e$esm$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/Dev/personal/equinox-galactic/node_modules/@firebase/app-check/dist/esm/index.esm.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Dev$2f$personal$2f$equinox$2d$galactic$2f$apps$2f$calculator$2f$src$2f$firebase$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/Dev/personal/equinox-galactic/apps/calculator/src/firebase.ts [app-ssr] (ecmascript)");
"use client";
;
;
;
let inited = false;
function AppCheckInit() {
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Dev$2f$personal$2f$equinox$2d$galactic$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        if (inited) return;
        inited = true;
        if ("TURBOPACK compile-time truthy", 1) {
            // In dev, ask Firebase to print a debug token in console
            // @ts-ignore
            self.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
        }
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Dev$2f$personal$2f$equinox$2d$galactic$2f$node_modules$2f40$firebase$2f$app$2d$check$2f$dist$2f$esm$2f$index$2e$esm$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["initializeAppCheck"])(__TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Dev$2f$personal$2f$equinox$2d$galactic$2f$apps$2f$calculator$2f$src$2f$firebase$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["app"], {
            provider: new __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Dev$2f$personal$2f$equinox$2d$galactic$2f$node_modules$2f40$firebase$2f$app$2d$check$2f$dist$2f$esm$2f$index$2e$esm$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["ReCaptchaV3Provider"](("TURBOPACK compile-time value", "6LcMxXIsAAAAACQn1L80Q0Y35FzdIwReG3IfgHAA")),
            isTokenAutoRefreshEnabled: true
        });
    }, []);
    return null;
}
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__c521f2ed._.js.map