# Configuração de Impressão Silenciosa (Kiosk Mode)

Para que o sistema imprima direto na impressora térmica sem abrir a caixa de diálogo do navegador, siga este passo a passo:

1.  **Crie um atalho** do Google Chrome na Área de Trabalho.
2.  Clique com o botão direito no atalho e selecione **Propriedades**.
3.  No campo **Destino**, vá até o final do texto e adicione o seguinte comando (com um espaço antes):
    ` --kiosk-printing`
    
    Exemplo de como deve ficar:
    `"C:\Program Files\Google\Chrome\Application\chrome.exe" --kiosk-printing`

4.  Clique em **Aplicar** e **OK**.

**Como usar:**
Sempre que for abrir o sistema para trabalhar, use **este atalho específico**. Ao finalizar um pedido, a impressão sairá automaticamente na impressora padrão do Windows, sem exibir nenhuma janela.

> **Nota:** Certifique-se de que a impressora térmica esteja definida como a **Impressora Padrão** no Windows.
