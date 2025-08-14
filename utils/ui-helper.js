export function displayMessageBox(message, type) {
const messageBox = document.createElement('div');
messageBox.className = `message-box ${type}`;
messageBox.textContent = message;
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
    let messageBoxContainer = document.getElementById('storyMessageBoxContainer');
    if (!messageBoxContainer) {
        messageBoxContainer = document.createElement('div');
        messageBoxContainer.id = 'storyMessageBoxContainer';
        messageBoxContainer.className = 'fixed top-5 right-5 z-[100]';
        document.body.appendChild(messageBoxContainer);
    }

    const messageBox = document.createElement('div');
    let messageBoxClasses = 'relative p-4 mb-3 rounded-lg shadow-lg text-white max-w-sm w-full flex items-center justify-between animate-slideIn ';

    if (type === 'success') {
        messageBoxClasses += 'bg-green-500';
    } else if (type === 'error') {
        messageBoxClasses += 'bg-red-500';
    } else {
        messageBoxClasses += 'bg-blue-500';
    }
    messageBox.className = messageBoxClasses;

    messageBox.innerHTML = `
        <span>${message}</span>
        <button class="ml-4 text-white opacity-75 hover:opacity-100 close-message-box">
            <i class="fas fa-times"></i>
        </button>
    `;

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
        messageBox.appendChild(buttonContainer);
    }

    messageBoxContainer.appendChild(messageBox);

    if (!isConfirmation) {
        setTimeout(() => {
            messageBox.remove();
        }, 5000);
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
