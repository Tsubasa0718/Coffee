// モジュールをインポート
import { src, dest } from "gulp";
import gulp from "gulp";
import * as dartSass from "sass";
import gulpSass from "gulp-sass";
import rename from "gulp-rename";
import sourcemaps from "gulp-sourcemaps";
import ejs from "gulp-ejs";
import browserSync from "browser-sync";
import autoprefixer from "gulp-autoprefixer";
import groupCssMediaQueries from "gulp-group-css-media-queries";
import rev from "gulp-rev";
import revReplace from "gulp-rev-replace";
import fs from "fs";
import revDel from "gulp-rev-delete-original";
import { navData, menuData, articleData } from "./src/data/data.js";

const sass = gulpSass(dartSass);
const bs = browserSync.create();

// マニフェストを取得
const getManifest = () => {
    let manifest = {};
    if (fs.existsSync("dist/rev-manifest.json")) {
        manifest = JSON.parse(fs.readFileSync("dist/rev-manifest.json", "utf8"));
    }
    return manifest;
};

// EJSのコンパイル
const CompileEjs = () => {
    const manifest = getManifest();
    return src("src/views/index.ejs")
        .pipe(
            ejs(
                {
                    title: "サイトタイトル",
                    navData,
                    menuData,
                    articleData,
                    css: manifest["css/style.css"] || "css/style.css",
                },
                {},
                { ext: ".html" }
            )
        )
        .pipe(rename({ extname: ".html" }))
        .pipe(revReplace({ manifest: src("dist/rev-manifest.json") })) // ここに移動
        .pipe(dest("dist"));
};

// Sassのコンパイル
const CompileSass = () => {
    return src("src/styles/style.scss")
        .pipe(sourcemaps.init()) // ソースマップの開始
        .pipe(sass().on("error", sass.logError)) // Sassのコンパイル（←これが抜けていた）
        .pipe(autoprefixer({ overrideBrowserslist: ["last 2 versions"], grid: true, cascade: false }))
        .pipe(groupCssMediaQueries()) // メディアクエリをグループ化
        .pipe(rename("style.css"))
        .pipe(sourcemaps.write(".")) // ソースマップを出力
        .pipe(dest("dist/css"))
        .pipe(rev()) // ハッシュ付きファイル名に変更
        .pipe(dest("dist/css"))
        .pipe(rev.manifest("dist/rev-manifest.json", { merge: true }))
        .pipe(dest(".")) // マニフェストをルートに出力
        .pipe(revDel()); // マニフェスト更新後に不要なファイルを削除
};

// 画像のコピー
const CopyImages = () => {
    return src("src/img/**/*", { encoding: false }).pipe(dest("dist/img"));
};

// faviconコピー
const CopyFavicon = () => {
    return src("favicon.ico", { encoding: false }).pipe(dest("dist"));
};

// ライブリロード
const Server = () => {
    bs.init({
        server: {
            baseDir: "dist",
        },
        open: true,
        notify: false,
    });
    gulp.watch("src/styles/**/*.scss", gulp.series(CompileSass, CompileEjs)); // Sass更新時にEJSも再コンパイル
    gulp.watch("src/views/**/*.ejs", CompileEjs);
};

// build task
export const build = gulp.series(CompileSass, CompileEjs, CopyImages, CopyFavicon);

// Watch Task
export const watch = gulp.series(build, Server);

// Default Task
export default watch;
