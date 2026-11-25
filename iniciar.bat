@echo off
chcp 65001 >nul
title ASTA MD
cd /d "%~dp0"

if not exist "dados\src\index.js" (
  echo [ERRO] Este arquivo precisa ficar na pasta principal do bot ^(onde esta o package.json^).
  pause
  exit /b
)

if not exist "node_modules" (
  echo Instalando dependencias pela primeira vez...
  call npm install
)

:inicio
echo Iniciando o ASTA MD em: %cd%
node dados\src\.scripts\start.js
echo.
echo O bot fechou. Reiniciando em 5 segundos... ^(feche esta janela para parar^)
timeout /t 5 >nul
goto inicio
