var gulp = require('gulp');
var rename = require('gulp-rename');
var uglify = require('gulp-uglify');
var less = require('gulp-less');
var cssmin = require('gulp-minify-css');

gulp.task('js', function() {  
    return gulp.src('src/js/cityselector.js')
        .pipe(gulp.dest('dist/js'))
        .pipe(rename({ suffix: '.min' }))
        .pipe(uglify())
        .pipe(gulp.dest('dist/js'));
});

gulp.task('less', function () {
    return gulp.src('src/css/cityselector.less')
        .pipe(less())
        .pipe(gulp.dest('dist/css'))
        .pipe(cssmin())
        .pipe(rename({ suffix: '.min' }))
        .pipe(gulp.dest('dist/css'));
});
gulp.task('watch', function (cb) {
    gulp.watch('src/js/cityselector.js', ['js']);
    gulp.watch('src/css/cityselector.less', ['less']);
});
gulp.task('default', ['js', 'less']);