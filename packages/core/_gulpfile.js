var gulp = require("gulp");
var ts = require("gulp-typescript");
var tsProject = ts.createProject("tsconfig.json");
var merge = require('merge2');

gulp.task("build", function () {
    var tsResult = tsProject.src()
        .pipe(ts(tsProject));
    return merge([tsResult.js.pipe(gulp.dest("dist")),
    tsResult.dts.pipe(gulp.dest("dist"))]);
});