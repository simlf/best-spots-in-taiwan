import axios from 'axios';
import { $ } from './bling';

function ajaxHeart(e) {
  e.preventDefault();
  axios
    .post(this.action)
    .then(response => {
      const isHearted = this.heart.classList.toggle('heart__button--hearted');
      $('.heart-count').textContent = response.data.hearts.length;
      if (isHearted) {
        this.heart.classList.add('heart__button--float'); // add a CSS animation to the hearts
        setTimeout(() => this.heart.classList.remove('heart__button--float'), 2500); // after 2.5 seconds, remove this animation
      }
    })
    .catch(console.error);
}

export default ajaxHeart;
