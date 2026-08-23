<style>
h1 { color: #0e8114; padding-top: 30px; } h2 { color: #0753aa; padding-top: 15px; } h3 { color: #f8af41; padding-top: 8px; } h4 { color: #9865ea; padding-top: 8px; }a { color: #b262c0; text-decoration: underline; }

</style>

# Minha necessidade

Criei uma pasta chamada 'spec' para esta especificação.
Quero criar uma ferramenta de sprint retrospectiva do framework Scrum.Para isso, vamos utilizar a pasta scrumtools. Dentro dela, quero cards semelhantes ao que já existe na raiz dessa projeto com o texto "Pagamento com QR Code" (vide anexo card-exemplo.png).
Em resumo, teremos na home do scrum tools:

- 1 card Scrum Planning -> deixe apenas o card sem click implementado
- 1 card Scrum Retrospective -> implementaremos agora a ferramenta.

# Especificação de negócio

## página principal: Scrum Tools

Apenas os cards, conforme o anexo `card-exemplo.png` que mostra a página raíza deste site.

## página Scrum Retro

Será uma cópia do site EasyRetro.io. Veja o anexo `easyretro-screen.png` para tomar por base o visual.

### Funcionamento do Scrum Retro

#### Página inicial

O usuário pode escolher entre acessar uma sala já existente, a partir do seu código já gerado, ou criar uma sala.

#### Botão/card Criar sala (+)

Ao clicar no botão nova sala, o usuário terá um modal onde deve inserir o nome da sala. Deixe um campo de 50 caracteres para isso. Em seguida, deve clicar no botão Continuar.

Após dar o nome da sala, o usuário, o usuário deve escolher entre um modelo pré-existente ou criar seu modelo, informando quantas colunas deseja na nova sala.

Os modelos pré-existentes devem ser:

- Começar, Continuar, Parar
- Bom, A melhorar
- Bom, Nem tão bom assim, Novas ideias
- Sinal, Ruído
- Âncoras, Motor

Caso o usuário escolha um dos modelos, o sistema deve criar tantas colunas quanto o modelo propõe. Caso escolher crair o próprio modelo, deve informar quantas colunas deseja, então o sistema deve criar quantas colunas forem informadas. Neste caso, o nome das colunas ficará **A preencher** na próxima tela.

O sistema deve gerar uma sala com id aleatório alfanumérico de 4 caracteres no formato xxxx, de forma que esse id será utilizado pelo restante da equipe do criador da sala para acessar a mesma sala. O link de acesso (url) da sala será no formato [.../scrumtools/retro/xxxx](.../scrumtools/retro/xxxx). Antes de efetivamente criar uma sala, o sistema deve verificar se já existe alguma sala com este ID e então trocar caso encontre.

#### Sala existente

Uma vez que a sala for criada, no passo anterior, ela já permite ser acessada como uma sala existente.

Em posse de um código da sala no formato xxxx, o usuário pode escolher acessar uma sala existente na home do scrumtools. Para isso, deve haver um campo em branco e um botão **Acessar** ao lado. Ao clicar no botão, o usuário acessará a sala já existente.

A página deve conter a quantidade de colunas especificada no passo anterior.

A página deve permitir que o usuário esoclha entre modelo dark/light.

A página deve possuir um botão com o texto **Copiar código da sala** de forma automática, ou seja, apenas clicando no botão.

A página deve ser responsiva.

O cabeçalho da coluna deve

- exibir o nome da coluna de forma destacada, com no máximo 30 caracteres, respeitando a nomenclatura que pode ter sido informada no passo anterior através da escolha de um modelo
- ser editável por qualquer usuário
- permitir que o usuário escolha a cor dos cards da coluna, exibindo um objeto de escolha de cores HTML.

Dentro de cada coluna, deve ser possível criar cards de texto, onde o usuário deve inserir texto sem formatação.

Deve ser possível

- excluir um card
- reordenar os cards, no formato drag-and-drop
- mover o card para outra coluna

##### Formato do card

Ao criar um card, o mesmo deve ser salvo no db.

Cada card deve conter:

- borda de 1px, conforme a cor da coluna
  - caso a cor da coluna seja alterada, todos os cards também devem ter sua boarda alterada
- campo texto com capacidade de 200 caracteres
  - o texto escrito no card deve ser salvo no db quando o usuário sair do card, ou seja, quando o objeto perder o foco
- botão no formato **like** clicável, no canto superior direito, transparente e com borda na cor da coluna (que chamarei aqui de like desligado), de forma que fique totalmente preenchido pela cor da coluna quando for clicável (que chamarei aqui de like ligado)
  - se for clicado novamente, o botão volta a sua forma original (like desligado)
- botão Lixeira no canto inferior direito, que exibirá modal de confirmação e apagará o card se o usuário confirmar
- botão emoji, no canto inferior esquerdo, que deve permitir que os usuários selecionem um emoji a partir de um modal de emojis
  - no caso de mais de usuário escolher o mesmo emoji, deve haver um contador do emoji algo como :emoji (3)
  - no caso de os usuários escolherem emojis diferentes, devem ser enfileirados, mantendo o formato de contador caso tenha mais de um voto com o mesmo emoji

##### Formato da coluna

A coluna deve conter:

- campo de nome no topo da coluna, destacado
- botão para escolha da cor da coluna
- contador de likes, que deve contar quantos cards possuem o like ligado na coluna
- cor padrão inicial branca, mantendo 20% de transparência
- opção para deletar a coluna. Neste caso, deve haver uma modal de confirmação e, mesmo confimando, deve haver uma segunda modal de confirmação informando que a coluna será deletada e todos os dados serão perdidos. Neste caso, a coluna não será apagada literalmente no db, ou seja, será uma deleção lógica, porém para o usuário será transparente e parecerá que foi de fato apagada

##### Formato da página

A página deve conter:

- o cabeçalho do site

- nome da sala no topo, de forma datacada, de forma editável e no máximo 50 caracteres. Formato: Sala: [NOME QUE O USR ESCOLHER]

- colunas lado a lado, com tamanhos iguais e ocupando toda a página web
  - se o acesso for mobile (responsivo), deslocar as colunas verticalmente, também ocupando todo o espaço horizontal da tela
- um botão que possibilite o usuário criar mais uma coluna, de forma que se isso acontecer, o tamanho das colunas já existentes será ajustado para ficarem com mesmo tamanho

##### Logs

O que deve ser logado:

- criação de sala
- acesso a uma sala existente
- criação e deleção de colunas
- criação e deleção de card
- edição de nome de sala
- edição de nome de coluna
- seleção e edição da cor da coluna

##### Acesso

O acesso de casa usuário deve ser anônimo

## Tecnologia

### Banco de dados (DB)

Todas as ações nas telas devem ser salvas diretamente no db, como alteração de nomes de colunas, texto dos cards.

Deve haver uma tabela para parametrização da variáveis.

### Framework frontend e backend

Toda a escrita de código frontend deve seguir a mesma tecnologia da página CNAB Editor.

Deve contemplar camadas de desenvolvimento frontend, controller, service, repository, não necessariamente com estes nomes.

No front end deve existir um objeto que permeie entre todas as páginas, de forma que eu posso inserir um código do Google Analytics em breve.

# Hospedagem

Github: https://github.com/robsonbrock/finlab.git
Vercel: https://vercel.com/robsonbrocks-projects/finlab -> quero criar um projeto próprio para ScrumTools para o diretório, semelhante ao que fiz com o CNAB Editor
SupaBase: a criar

# Expurgo

Deve haver uma rotina para excluir registros com mais de 30 dias. Esse número deve ser setado na tabela de params.
