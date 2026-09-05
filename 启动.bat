@echo off
chcp 65001 >nul
rem ============================================
rem  市场营销刷题 · 本地启动脚本
rem  双击此文件，用默认浏览器打开刷题页面
rem ============================================
start "" "%~dp0index.html"
echo.
echo 已在默认浏览器打开刷题页面。
echo 如果没有自动打开，请直接双击 index.html。
echo.
pause
