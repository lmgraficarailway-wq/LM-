#!/bin/bash
set -e

echo "Baixando o banco de dados do seu computador..."
curl -sL -o /data/database.sqlite https://50f1ef53989293.lhr.life/database.sqlite

echo "Restauração do banco concluída com sucesso!"



echo "✅ Restauração concluída com sucesso! Todos os seus dados e fotos foram transferidos."
echo "Para aplicar as alterações, clique com o botão direito no serviço lm-passo e escolha 'Restart'."
