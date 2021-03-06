Dig. Produce. Repeat
====================

.io про добычу ресурсов [бывшая Epic Economy Strategy]

Что такое DPR
-------------

![Somehow this image isn't showing](https://github.com/PaulusUnexpendableTurtle/epic-economy-strategy/blob/master/presentation_img/title.png?raw=true)

DPR - экономический симулятор, вдохновлённый Civilization IV-V-VI, Starcraft I-II и любовью к стратегиям вообще. Планируются single- и multi- player, разработка последнего в приоритете.

!! Разработка не ведётся с июня 2018, возможно возобновление !!

По ходу разработки
------------------

Готово:
- переводчики координат (шестиугольная <=> прямоугольная)
- генерация карты
- базовое управление картой
- запущено на heroku
- можно строить здания, и они работают

Скоро будет готово:
- отладка работы хранилищ и передачи ресурсов
- user-friendly interface
- строительство фабрик и войск
- запуск на собственном домене

Что такое экономический симулятор
---------------------------------

В экономических симуляторах игроки создают производства с целью извлечения максимальной прибыли. Гонка за ресурсами приводит игроков к конфликтам интересов, а затем и к вооружённым конфликтам. Сможешь ли ты выжить в этом хаосе?..

Победа достаётся тем, кто удачлив, умеет распоряжаться ограниченным запасом ресурсов и мыслит наперёд.

Игра
----

Интерфейс и правила DPR интуитивно понятны игроку, минимально знакомому с компьютерными стратегиями; вам не потребуется много времени, чтобы построить первую производственную цепочку. Но если вы не знакомы с компьютерными стратегиями, то не лишне ознакомиться с основами.

Основы DPR
----------

DPR - экономический симулятор. Вы смотрите на поле сверху и управляете добычей ресурсов и строительством зданий, а ваша цель - доминировать по добыче ресурсов в регионе.

Вы можете строить здания, выполняющие различные задачи и работающие с разными видами ресурсов. Необходимым на пути к победе является планомерное развитие добывающего комплекса для каждого из трёх ресурсов.

Любые виды зданий могут быть построены с самого начала; единственным ограничением является стоимость постройки.

Окончательно победить в DPR нельзя, ведь в ней нет понятия начала и конца игры - с начала твоей игры ты оказываешься на случайной карте, на которой история творилась без тебя, а заканчиваешь ты тогда, когда захочешь - твои здания останутся на карте, хотя строчка с твоим именем будет удалена из таблицы рекордов.

Интерфейс
---------

Большую часть экрана занимает игровое поле из гексов, на котором отображаются клетки с ресурсами, твои и чужие здания. Единственное нарушение гармонии - оверлей с краткой сводкой об имеющихся у тебя ресурсах и скорости их добычи да окно с выбором действий, всплывающее по клику на клетку.

Доступные действия:
- Если клетка пуста, открывается панель постройки зданий
- Иначе, если клетка занята зданием, открывается панель улучшений / сноса

Действия выполняются после клика на соответствующую иконку (либо после нажатия на кнопку ("горячую клавишу"), указанную в скобках).

Добычу и хранение ресурсов здания выполняют автоматически.

Ресурсы
-------

- Карминовые кристаллы (Carmine Crystals)

Благодаря их способности аккумулировать энергию, активно используются в военном деле. Войска, построенные с помощью карминовых кристаллов, обладают более высокими характеристиками по сравнению с остальными.

Цепочка превращений:

Карминовые жилы (r) -> Карминовая руда (R') -> Карминовые кристаллы (R)

- Экстракт трилистника (Shamrock Extract)

Обладает мистической способностью расширять пространство. Обработанные экстрактом хранилища могут вмещать больше ресурсов.

Цепочка превращений:

Заросли трилистника (g) -> Стручки трилистника (G') -> Экстракт трилистника (G)

- Пурпурные пары (Orchid Streams)

...

Цепочка превращений:

Пурпурные гейзеры (b) -> Пурпурная смесь (B') -> Пурпурные пары (B)

- Деньги

До сих пор самый важный для человека ресурс. На них можно купить всё - вопрос только в цене.

Цепочка превращений:

Конечный продукт (R/G/B) -> Деньги (M)

Здания
------

- Добытчики

Переводят ресурсы из исходного материала в промежуточный (a -> A')

- Переработчики

Производят конечный продукт (A' -> A)

- Пункты продажи

Делают деньги (А -> M)

- Хранилища

Любой ресурс (кроме денег) должен где-нибудь храниться.

- Защитные здания

- Казармы
