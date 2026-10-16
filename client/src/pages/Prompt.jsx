import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import Prompt from '../components/Prompt';
import { getPromptById } from '../utils/getPrompts.js';

export default function PromptPage() {
    const { id } = useParams();
    const [promptData, setPromptData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (id) {
            setIsLoading(true);
            getPromptById(id)
                .then(data => {
                    setPromptData(data);
                })
                .catch(error => {
                    console.error("Failed to fetch prompt:", error);
                    setPromptData(null);
                })
                .finally(() => {
                    setIsLoading(false);
                });
        }
    }, [id]);

    if (isLoading) {
        return (
            <div className="text-center p-10 text-white">Loading Prompt...</div>
        );
    }

    if (!promptData) {
        return (
            <div className="text-center text-white p-10">Prompt not found or an error occurred.</div>
        );
    }

    return (
        <Prompt
            id={promptData._id || id}
            imageSrc={promptData.imageUrl}
            title={promptData.title}
            description={promptData.description}
            category={promptData.category}
            aiModel={promptData.aiModel}
            pricePaise={promptData.pricePaise}
            isUnlocked={promptData.isUnlocked}
            likes={promptData.likes}
            isLiked={promptData.isLiked}
            updatedOn={promptData.updatedAt}
            promptText={promptData.promptText}
            negativePrompt={promptData.negativePrompt}
            seed={promptData.seed}
            author={promptData.author || "Anonymous"}
        />
    );
}
