import {task, src, dest} from 'gulp';
import {spawnSync} from 'child_process';
import {resolve, join} from 'path';
import {sequenceTask} from '../utils/sequence-task';
import {inlineAssetForDirectory} from '../utils/inline-asset';
import {config} from '../utils/config';

const rollup = require('rollup');
const rollupNodeResolutionPlugin = require('rollup-plugin-node-resolve');
const rollupCommonjsPlugin = require('rollup-plugin-commonjs');
const htmlmin = require('gulp-htmlmin');
const less = require('gulp-less');
const LessAutoprefix = require('less-plugin-autoprefix');
const autoprefixPlugin = new LessAutoprefix({browsers: ['last 2 versions']});
const gulpCleanCss = require('gulp-clean-css');
const uglifyJS = require('uglify-js');

const htmlMinifierOptions = {
    collapseWhitespace: true,
    removeComments: true,
    caseSensitive: true,
    removeAttributeQuotes: false
};

task('build', sequenceTask(
    'clean',
    'build:aot',
    'build:assets',
    'build:inline-assets',
    'build:bundle',
    'build:uglify',
    'build:package'
));

/**
 * 使用 ngc 进行 AOT 编译
 */
task('build:aot', () => {
    const ngcPath = resolve('./node_modules/.bin/ngc');
    const childProcess = spawnSync(ngcPath, ['-p', config.tsconfigPath]);

    if (childProcess.stdout.toString()) {
        console.log('success');
        console.log(childProcess.stdout.toString());
    }

    if (childProcess.stderr.toString()) {
        console.log('error');
        console.log(childProcess.stderr.toString());
    }
});

/**
 * 替换 AOT 编译后组件中的 templateUrl 和 styleUrls 资源
 */
task('build:inline-assets', () => {
    inlineAssetForDirectory(config.dist);
});

/**
 * 处理资源
 */
task('build:assets', sequenceTask(['build:assets:html', 'build:assets:less']));

// 处理 HTML 资源
task('build:assets:html', () => {
    return src(join(config.componentPath, '**/*.html'))
        .pipe(htmlmin(htmlMinifierOptions))
        .pipe(dest(config.dist));
});

// 处理 LESS 资源
task('build:assets:less', () => {
    return src(join(config.componentPath, '**/*.less'))
        .pipe(less({
            plugins: [autoprefixPlugin]
        }))
        .pipe(gulpCleanCss())
        .pipe(dest(config.dist));
});

/**
 * 打包成 UMD 格式，便于 plnkr 和 System.js 等引用
 */
task('build:bundle', async () => {
    const inputOptions = {
        context: 'this',
        input: config.entry,
        external: [
            '@angular/core',
            '@angular/common',
            '@angular/forms',
            '@angular/router',
            '@angular/http'
        ],
        plugins: [
            rollupNodeResolutionPlugin(),
            rollupCommonjsPlugin()
        ]
    };

    const outputOptions = {
        format: 'umd',
        moduleId: '',
        name: config.moduleName,
        globals: {
            '@angular/core': 'ng.core',
            '@angular/common': 'ng.common',
            '@angular/forms': 'ng.forms',
            '@angular/router': 'ng.router',
            '@angular/http': 'ng.http'
        },
        file: join(config.umdPath, `${config.moduleName}.umd.js`),
        banner: `/** Copyright (c) BAIDU INC. */`,
        sourcemap: true
    };

    const bundle = await rollup.rollup(inputOptions);
    const {code, map} = await bundle.generate(outputOptions);

    await bundle.write(outputOptions);
});

task('build:uglify', (cb?: Function) => {
    const uglifyPath = resolve('./node_modules/.bin/uglifyjs');
    const umdFile = join(config.umdPath, `${config.moduleName}.umd.js`);
    const umdMiniFile = join(config.umdPath, `${config.moduleName}.umd.min.js`);
    const childProcess = spawnSync(uglifyPath, ['-c', '-m', '--source-map', '-o',  umdMiniFile, '--', umdFile]);

    cb && cb();
});
