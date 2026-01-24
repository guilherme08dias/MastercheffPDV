@echo off
echo Fechando o Chrome para garantir a configuracao...
taskkill /F /IM chrome.exe >nul 2>&1

echo Iniciando Servidor de Impressao em Modo Automatico...
echo.
echo IMPORTANTE:
echo 1. Se pedir confirmacao de "Restaurar paginas", clique no X para fechar o aviso.
echo 2. A impressora padrao deve ser a Epson TM-T20.
echo.

start chrome.exe --kiosk-printing "%~dp0print-server.html"

echo Concluido! O navegador foi aberto.
pause
