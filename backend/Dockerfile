FROM python:3.8-buster

WORKDIR /python-docker

COPY requirements.txt requirements.txt

RUN pip3 install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 5000

CMD [ "python", "main.py" ]