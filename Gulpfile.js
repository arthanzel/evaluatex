var gulp = require("gulp");
var concat = require("gulp-concat");
var uglify = require("gulp-uglify");
var rename = require("gulp-rename");
 
gulp.task("default", function() {
    return gulp.src(["src/intro.js_", "src/**/*.js", "src/outro.js_"])
        .pipe(concat("evaluatex.js"))
        .pipe(gulp.dest("dist"))
        //.pipe(uglify())
        .pipe(rename("evaluatex.min.js"))
        .pipe(gulp.dest("dist"));
});

gulp.task("watch", function() {
    gulp.watch("src/**/*.js", ["default"]);
});