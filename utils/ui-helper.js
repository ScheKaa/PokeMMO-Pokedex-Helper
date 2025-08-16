export function displayMessageBox(message, type) {
    const messageBox = document.createElement('div');
    messageBox.className = `message-box ${type}`;
    const contentWrapper = document.createElement('div');
    contentWrapper.className = 'message-box-content';
    contentWrapper.textContent = message;

    messageBox.appendChild(contentWrapper);
    document.body.appendChild(messageBox);

    setTimeout(() => {
        messageBox.style.opacity = '1';
    }, 10);

    setTimeout(() => {
        messageBox.style.opacity = '0';
        messageBox.addEventListener('transitionend', () => {
            messageBox.remove();
        }, { once: true });
    }, 3000);
}

export function createMessageBox(type, message, isConfirmation = false, onConfirm = null) {
    const messageBox = document.createElement('div');
    let messageBoxClasses = 'message-box ';

    if (type === 'success') {
        messageBoxClasses += 'success';
    } else if (type === 'error') {
        messageBoxClasses += 'error';
    } else {
        messageBoxClasses += 'info';
    }
    messageBox.className = messageBoxClasses;

    const contentWrapper = document.createElement('div');
    contentWrapper.className = 'message-box-content';

    if (type === 'success') {
        messageBox.classList.add('success');
    } else if (type === 'error') {
        messageBox.classList.add('error');
    } else {
        messageBox.classList.add('info');
    }

    contentWrapper.innerHTML = `
        <span>${message}</span>
        <button class="ml-4 text-white opacity-75 hover:opacity-100 close-message-box">
            <i class="fas fa-times"></i>
        </button>
    `;
    messageBox.appendChild(contentWrapper);

    if (isConfirmation) {
        const buttonContainer = document.createElement('div');
        buttonContainer.className = 'mt-3 flex justify-end space-x-2';

        const yesButton = document.createElement('button');
        yesButton.textContent = 'Yes';
        yesButton.className = 'px-4 py-2 bg-white text-blue-700 rounded-md hover:bg-gray-100';
        yesButton.onclick = () => {
            if (onConfirm) onConfirm();
            messageBox.remove();
        };

        const noButton = document.createElement('button');
        noButton.textContent = 'No';
        noButton.className = 'px-4 py-2 bg-gray-300 text-gray-800 rounded-md hover:bg-gray-400';
        noButton.onclick = () => messageBox.remove();

        buttonContainer.appendChild(yesButton);
        buttonContainer.appendChild(noButton);
        contentWrapper.appendChild(buttonContainer);
    }

    document.body.appendChild(messageBox); 

    setTimeout(() => {
        messageBox.style.opacity = '1';
    }, 10);

    if (!isConfirmation) {
        setTimeout(() => {
            messageBox.style.opacity = '0';
            messageBox.addEventListener('transitionend', () => {
                messageBox.remove();
            }, { once: true });
        }, 3000);

        messageBox.addEventListener('click', () => {
            messageBox.style.opacity = '0';
            messageBox.addEventListener('transitionend', () => {
                messageBox.remove();
            }, { once: true });
        }, { once: true });
    }

    messageBox.querySelector('.close-message-box').onclick = () => {
        messageBox.remove();
    };
}

export function showModal(modalElement) {
    modalElement.classList.add('visible');
}

export function hideModal(modalElement) {
    modalElement.classList.remove('visible');
}
